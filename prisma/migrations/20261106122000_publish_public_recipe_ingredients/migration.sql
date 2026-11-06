-- Ingredients used by a public recipe must themselves be public.
-- Covers direct ingredients and ingredient-based component options.
UPDATE "Ingredient" AS ingredient
SET status = 'GLOBAL',
    "createdByUserId" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE ingredient.status <> 'GLOBAL'
  AND (
    EXISTS (
      SELECT 1
      FROM "RecipeIngredient" AS recipe_ingredient
      INNER JOIN "Recipe" AS recipe
        ON recipe.id = recipe_ingredient."recipeId"
      WHERE recipe_ingredient."ingredientId" = ingredient.id
        AND recipe."isPublic" = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM "RecipeComponentOption" AS component_option
      INNER JOIN "RecipeComponent" AS component
        ON component.id = component_option."componentId"
      INNER JOIN "Recipe" AS recipe
        ON recipe.id = component."recipeId"
      WHERE component_option."ingredientId" = ingredient.id
        AND recipe."isPublic" = TRUE
    )
  );
