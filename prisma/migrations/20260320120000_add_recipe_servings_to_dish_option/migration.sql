-- Legacy migration compatibility:
-- Older schemas used "DishSlotOption" while current schemas use
-- "RecipeComponentOption". Skip safely if neither table exists.
DO $$
BEGIN
	IF to_regclass('"DishSlotOption"') IS NOT NULL THEN
		ALTER TABLE "DishSlotOption" ADD COLUMN IF NOT EXISTS "recipeServings" DOUBLE PRECISION;
	ELSIF to_regclass('"RecipeComponentOption"') IS NOT NULL THEN
		ALTER TABLE "RecipeComponentOption" ADD COLUMN IF NOT EXISTS "recipeServings" DOUBLE PRECISION;
	END IF;
END $$;
