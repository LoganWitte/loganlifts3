-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "bioPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bodyWeightPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liftsPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profilePhotoPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profilePublic" BOOLEAN NOT NULL DEFAULT false;
