/*
  Warnings:

  - A unique constraint covering the columns `[joinCode]` on the table `Household` will be added. If there are existing duplicate values, this will fail.
  - The required column `joinCode` was added to the `Household` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable: Add joinCode as nullable first, populate, then add unique
ALTER TABLE "Household" ADD COLUMN "joinCode" TEXT;
UPDATE "Household" SET "joinCode" = gen_random_uuid()::text WHERE "joinCode" IS NULL;

-- AlterTable
ALTER TABLE "WeekPlan" ADD COLUMN     "ingredientId" INTEGER,
ADD COLUMN     "ingredientQty" DOUBLE PRECISION,
ADD COLUMN     "ingredientUnit" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Household_joinCode_key" ON "Household"("joinCode");

-- AddForeignKey
ALTER TABLE "WeekPlan" ADD CONSTRAINT "WeekPlan_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
