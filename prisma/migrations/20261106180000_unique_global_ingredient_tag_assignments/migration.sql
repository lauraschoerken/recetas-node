-- PostgreSQL considera distintos los valores NULL dentro de un índice único.
-- Limpiamos posibles duplicados históricos y garantizamos una única asignación
-- global por pareja ingrediente/tag.
DELETE FROM "IngredientTagAssignment" AS duplicate
USING "IngredientTagAssignment" AS keeper
WHERE duplicate."userId" IS NULL
  AND keeper."userId" IS NULL
  AND duplicate."ingredientId" = keeper."ingredientId"
  AND duplicate."tagId" = keeper."tagId"
  AND duplicate."id" > keeper."id";

CREATE UNIQUE INDEX "IngredientTagAssignment_global_ingredientId_tagId_key"
ON "IngredientTagAssignment"("ingredientId", "tagId")
WHERE "userId" IS NULL;
