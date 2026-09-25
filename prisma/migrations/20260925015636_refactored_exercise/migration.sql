-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "isRejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSuggested" BOOLEAN NOT NULL DEFAULT false;
