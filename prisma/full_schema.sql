-- Full schema generated from prisma/schema.prisma
-- Date: 2026-04-04
-- Target: PostgreSQL

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "age" INTEGER,
    "gender" TEXT,
    "activityLevel" TEXT,
    "goal" TEXT,
    "customCalories" INTEGER,
    "customProtein" INTEGER,
    "customCarbs" INTEGER,
    "customFat" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "imageUrl" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "customCalories" DOUBLE PRECISION,
    "customProtein" DOUBLE PRECISION,
    "customCarbs" DOUBLE PRECISION,
    "customFat" DOUBLE PRECISION,
    "customFiber" DOUBLE PRECISION,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "preferredUnit" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "UnitConversion" (
    "id" SERIAL NOT NULL,
    "unitName" TEXT NOT NULL,
    "gramsPerUnit" DOUBLE PRECISION NOT NULL,
    "ingredientId" INTEGER NOT NULL,

    CONSTRAINT "UnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "recipeId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "cookedVariantId" INTEGER,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekPlan" (
    "id" SERIAL NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "type" TEXT NOT NULL DEFAULT 'meal',
    "cooked" BOOLEAN NOT NULL DEFAULT false,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekPlan_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitConversion_ingredientId_unitName_key" ON "UnitConversion"("ingredientId", "unitName");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_ingredientId_key" ON "RecipeIngredient"("recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekPlanSelection_weekPlanId_optionId_key" ON "WeekPlanSelection"("weekPlanId", "optionId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "UnitConversion" ADD CONSTRAINT "UnitConversion_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_cookedVariantId_fkey" FOREIGN KEY ("cookedVariantId") REFERENCES "IngredientVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekPlan" ADD CONSTRAINT "WeekPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekPlan" ADD CONSTRAINT "WeekPlan_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
