-- ChangelogEntry's columns never matched what the controller/seed/frontend
-- actually used (content/type vs. body/tags/published), so every seed
-- attempt has been silently failing since this feature was built and the
-- table has always been empty. Table has no rows, so this is a safe rename.

-- AlterTable
ALTER TABLE "ChangelogEntry" ALTER COLUMN "version" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ChangelogEntry" RENAME COLUMN "content" TO "body";

-- AlterTable
ALTER TABLE "ChangelogEntry" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "ChangelogEntry" ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "ChangelogEntry" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true;
