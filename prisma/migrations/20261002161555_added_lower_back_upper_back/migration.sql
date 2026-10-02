/*
  Warnings:

  - The values [Back] on the enum `BodyPart` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BodyPart_new" AS ENUM ('Whole Body', 'Chest', 'Upper Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Abductors', 'Adductors', 'Core', 'Lower Back');
ALTER TABLE "Exercise" ALTER COLUMN "bodyParts" TYPE "BodyPart_new"[] USING ("bodyParts"::text::"BodyPart_new"[]);
ALTER TYPE "BodyPart" RENAME TO "BodyPart_old";
ALTER TYPE "BodyPart_new" RENAME TO "BodyPart";
DROP TYPE "public"."BodyPart_old";
COMMIT;
