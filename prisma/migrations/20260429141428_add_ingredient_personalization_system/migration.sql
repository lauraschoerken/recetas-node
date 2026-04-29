-- DropIndex
DROP INDEX "Ingredient_name_key";

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "createdByUserId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'GLOBAL';

-- AlterTable
ALTER TABLE "IngredientVariant" ADD COLUMN     "createdByUserId" INTEGER,
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "IngredientUserOverride" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "preferredUnit" TEXT,
    "imageUrl" TEXT,
    "defaultLocation" TEXT,
    "preferredPurchaseVariantId" INTEGER,
    "purchaseIsIndifferent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IngredientUserOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientVariantUserOverride" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "calories" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "weightFactor" DOUBLE PRECISION,

    CONSTRAINT "IngredientVariantUserOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientConversionUserOverride" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "unitName" TEXT NOT NULL,
    "gramsPerUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "IngredientConversionUserOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" INTEGER,

    CONSTRAINT "IngredientTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientTagAssignment" (
    "id" SERIAL NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "IngredientTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientTagHidden" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "IngredientTagHidden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientProposal" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedByUserId" INTEGER NOT NULL,
    "reviewedByUserId" INTEGER,
    "ingredientId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "fieldName" TEXT,
    "currentValue" JSONB,
    "proposedValue" JSONB,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStore" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "logoUrl" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "householdId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStoreIngredient" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "purchaseUrl" TEXT,
    "preferredUnit" TEXT,

    CONSTRAINT "UserStoreIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientUserOverride_userId_ingredientId_key" ON "IngredientUserOverride"("userId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientVariantUserOverride_userId_variantId_key" ON "IngredientVariantUserOverride"("userId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientConversionUserOverride_userId_ingredientId_unitNa_key" ON "IngredientConversionUserOverride"("userId", "ingredientId", "unitName");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientTagAssignment_ingredientId_tagId_userId_key" ON "IngredientTagAssignment"("ingredientId", "tagId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientTagHidden_userId_ingredientId_tagId_key" ON "IngredientTagHidden"("userId", "ingredientId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStoreIngredient_storeId_ingredientId_key" ON "UserStoreIngredient"("storeId", "ingredientId");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientVariant" ADD CONSTRAINT "IngredientVariant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientUserOverride" ADD CONSTRAINT "IngredientUserOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientUserOverride" ADD CONSTRAINT "IngredientUserOverride_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientVariantUserOverride" ADD CONSTRAINT "IngredientVariantUserOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientVariantUserOverride" ADD CONSTRAINT "IngredientVariantUserOverride_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "IngredientVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientConversionUserOverride" ADD CONSTRAINT "IngredientConversionUserOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientConversionUserOverride" ADD CONSTRAINT "IngredientConversionUserOverride_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTag" ADD CONSTRAINT "IngredientTag_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagAssignment" ADD CONSTRAINT "IngredientTagAssignment_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagAssignment" ADD CONSTRAINT "IngredientTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "IngredientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagAssignment" ADD CONSTRAINT "IngredientTagAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagHidden" ADD CONSTRAINT "IngredientTagHidden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagHidden" ADD CONSTRAINT "IngredientTagHidden_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagHidden" ADD CONSTRAINT "IngredientTagHidden_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "IngredientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientProposal" ADD CONSTRAINT "IngredientProposal_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientProposal" ADD CONSTRAINT "IngredientProposal_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientProposal" ADD CONSTRAINT "IngredientProposal_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientProposal" ADD CONSTRAINT "IngredientProposal_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStore" ADD CONSTRAINT "UserStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStore" ADD CONSTRAINT "UserStore_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoreIngredient" ADD CONSTRAINT "UserStoreIngredient_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "UserStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoreIngredient" ADD CONSTRAINT "UserStoreIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
