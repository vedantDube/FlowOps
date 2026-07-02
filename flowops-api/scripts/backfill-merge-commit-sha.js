/**
 * One-off backfill: populate PullRequest.mergeCommitSha for PRs that were
 * merged before that field started being stored (see the
 * add_pr_merge_commit_sha migration and handlePullRequest in
 * github.webhook.js, which only started writing this field going forward).
 * Without this, the DORA "lead time for changes" metric can't resolve any
 * deploy to a PR for historical data — it only works for PRs merged after
 * the field was added.
 *
 * For each repo with merged PRs missing mergeCommitSha, fetches the repo's
 * merged PRs from GitHub (which includes merge_commit_sha per PR) and
 * updates matching rows by PR number.
 *
 * Usage: DATABASE_URL=<production-url> node scripts/backfill-merge-commit-sha.js
 * Safe to re-run — only touches rows where mergeCommitSha is still null.
 */

const prisma = require("../src/services/prisma");
const { getRepoPullRequests } = require("../src/services/github.service");

async function main() {
  const reposNeedingBackfill = await prisma.repository.findMany({
    where: {
      pullRequests: { some: { state: "merged", mergeCommitSha: null } },
    },
    select: { id: true, fullName: true, organizationId: true },
  });

  console.log(`Found ${reposNeedingBackfill.length} repo(s) with unbackfilled merged PRs.`);

  let totalUpdated = 0;

  for (const repo of reposNeedingBackfill) {
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: repo.organizationId },
      include: { user: true },
    });
    if (!member?.user?.accessToken) {
      console.log(`  ${repo.fullName}: no member with an access token, skipping`);
      continue;
    }

    const [owner, repoName] = repo.fullName.split("/");
    const shaByNumber = new Map();
    let page = 1;
    // GitHub's list-PRs endpoint includes merge_commit_sha per item —
    // paginate through closed PRs until an empty page.
    for (;;) {
      const prs = await getRepoPullRequests(member.user.accessToken, owner, repoName, "closed", 100, page);
      if (!prs.length) break;
      for (const pr of prs) {
        if (pr.merged_at && pr.merge_commit_sha) {
          shaByNumber.set(pr.number, pr.merge_commit_sha);
        }
      }
      if (prs.length < 100) break;
      page += 1;
    }

    const localPrs = await prisma.pullRequest.findMany({
      where: { repositoryId: repo.id, state: "merged", mergeCommitSha: null },
      select: { id: true, number: true },
    });

    let updatedForRepo = 0;
    for (const pr of localPrs) {
      const sha = shaByNumber.get(pr.number);
      if (sha) {
        await prisma.pullRequest.update({ where: { id: pr.id }, data: { mergeCommitSha: sha } });
        updatedForRepo += 1;
      }
    }

    console.log(`  ${repo.fullName}: updated ${updatedForRepo}/${localPrs.length} merged PRs`);
    totalUpdated += updatedForRepo;
  }

  console.log(`\nDone. ${totalUpdated} PR(s) backfilled.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
