/*
  Warnings:

  - A unique constraint covering the columns `[storeId,ingredientId,userId]` on the table `UserStoreIngredient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `UserStoreIngredient` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserStoreIngredient_storeId_ingredientId_key";

-- AlterTable: add nullable first, backfill from store owner, then set NOT NULL
ALTER TABLE "UserStoreIngredient" ADD COLUMN "userId" INTEGER;
UPDATE "UserStoreIngredient" usi
  SET "userId" = us."userId"
  FROM "UserStore" us
  WHERE usi."storeId" = us.id;
ALTER TABLE "UserStoreIngredient" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserStoreIngredient_storeId_ingredientId_userId_key" ON "UserStoreIngredient"("storeId", "ingredientId", "userId");

-- AddForeignKey
ALTER TABLE "UserStoreIngredient" ADD CONSTRAINT "UserStoreIngredient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
