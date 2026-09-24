-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "weightCoefficient" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Lift" ADD COLUMN     "addedWeight" DOUBLE PRECISION,
ADD COLUMN     "bodyWeight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bodyWeight" DOUBLE PRECISION,
ADD COLUMN     "bodyWeightAutoUpdate" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token");

-- DropIndex
DROP INDEX "VerificationToken_identifier_token_key";
