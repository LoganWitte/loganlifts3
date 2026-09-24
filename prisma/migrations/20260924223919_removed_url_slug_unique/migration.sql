-- DropIndex
DROP INDEX "Exercise_URLSlug_key";

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;
