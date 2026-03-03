-- DropForeignKey
ALTER TABLE "AICodeReview" DROP CONSTRAINT "AICodeReview_pullRequestId_fkey";

-- DropForeignKey
ALTER TABLE "AICodeReview" DROP CONSTRAINT "AICodeReview_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Commit" DROP CONSTRAINT "Commit_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "PullRequest" DROP CONSTRAINT "PullRequest_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "PullRequestReview" DROP CONSTRAINT "PullRequestReview_pullRequestId_fkey";

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICodeReview" ADD CONSTRAINT "AICodeReview_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICodeReview" ADD CONSTRAINT "AICodeReview_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
