/*
  Warnings:

  - A unique constraint covering the columns `[ingredientId,name]` on the table `IngredientVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "IngredientVariant_ingredientId_name_key" ON "IngredientVariant"("ingredientId", "name");

-- CreateIndex (partial): ingredientes GLOBAL deben tener nombre único
CREATE UNIQUE INDEX IF NOT EXISTS "Ingredient_name_global_key" ON "Ingredient"(name) WHERE status = 'GLOBAL';
