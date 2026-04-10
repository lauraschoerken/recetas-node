-- DropIndex
DROP INDEX "WeekPlan_userId_recipeId_plannedDate_key";

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "customCalories" DOUBLE PRECISION,
ADD COLUMN     "customCarbs" DOUBLE PRECISION,
ADD COLUMN     "customFat" DOUBLE PRECISION,
ADD COLUMN     "customFiber" DOUBLE PRECISION,
ADD COLUMN     "customProtein" DOUBLE PRECISION,
ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "instructions" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN     "cookedVariantId" INTEGER,
ADD COLUMN     "variantId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activityLevel" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "customCalories" INTEGER,
ADD COLUMN     "customCarbs" INTEGER,
ADD COLUMN     "customFat" INTEGER,
ADD COLUMN     "customProtein" INTEGER,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WeekPlan" ALTER COLUMN "recipeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recipeId" INTEGER NOT NULL,

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeComponentOption" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "componentId" INTEGER NOT NULL,
    "recipeId" INTEGER,
    "ingredientId" INTEGER,
    "variantId" INTEGER,
    "cookedVariantId" INTEGER,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "recipeServings" DOUBLE PRECISION,

    CONSTRAINT "RecipeComponentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientVariant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Crudo',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "calories" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "weightFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ingredientId" INTEGER NOT NULL,

    CONSTRAINT "IngredientVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekPlanSelection" (
    "id" SERIAL NOT NULL,
    "weekPlanId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "WeekPlanSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeItem" (
    "id" SERIAL NOT NULL,
    "location" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER,
    "recipeId" INTEGER,
    "variantId" INTEGER,

    CONSTRAINT "HomeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "weekPlanId" INTEGER,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeekPlanSelection_weekPlanId_optionId_key" ON "WeekPlanSelection"("weekPlanId", "optionId");

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponentOption" ADD CONSTRAINT "RecipeComponentOption_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "RecipeComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponentOption" ADD CONSTRAINT "RecipeComponentOption_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponentOption" ADD CONSTRAINT "RecipeComponentOption_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponentOption" ADD CONSTRAINT "RecipeComponentOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponentOption" ADD CONSTRAINT "RecipeComponentOption_cookedVariantId_fkey" FOREIGN KEY ("cookedVariantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientVariant" ADD CONSTRAINT "IngredientVariant_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_cookedVariantId_fkey" FOREIGN KEY ("cookedVariantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekPlanSelection" ADD CONSTRAINT "WeekPlanSelection_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "WeekPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekPlanSelection" ADD CONSTRAINT "WeekPlanSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "RecipeComponentOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "WeekPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
