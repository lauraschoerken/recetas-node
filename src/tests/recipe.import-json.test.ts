import { PrismaClient } from "@prisma/client";
import { createTestUser, cleanupTestUser, TestUser } from "./helpers";
import { recipeService } from "../services/recipe.service";

const prisma = new PrismaClient();

describe("Recipe JSON import - ingredient state and conversions", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser("recipe_json_import");
  });

  afterAll(async () => {
    await cleanupTestUser(user.id);
  });

  it("reuses the existing ingredient and creates missing states and conversions when importing JSON", async () => {
    const ingredientName = `Tomate import ${Date.now()}`;

    const existingIngredient = await prisma.ingredient.create({
      data: {
        name: ingredientName,
        unit: "g",
        status: "GLOBAL",
        variants: {
          create: [{ name: "Crudo", isDefault: true, weightFactor: 1 }],
        },
        conversions: {
          create: [{ unitName: "kg", gramsPerUnit: 1000 }],
        },
      },
      include: { variants: true, conversions: true },
    });

    const result = await recipeService.importFromJson(
      [
        {
          title: `Receta ${Date.now()} importada`,
          servings: 2,
          ingredients: [
            {
              name: ingredientName,
              quantity: 250,
              unit: "g",
              variantName: "Cocinado",
              cookedVariantName: "Cocinado",
              variants: [
                { name: "Crudo", isDefault: true, weightFactor: 1 },
                { name: "Cocinado", isDefault: false, weightFactor: 1.5 },
              ],
              conversions: [
                { unitName: "kg", gramsPerUnit: 1000 },
                { unitName: "cucharada", gramsPerUnit: 15 },
              ],
            },
          ],
        },
      ],
      user.id,
    );

    expect(result.importedCount).toBe(1);

    const importedRecipe = await prisma.recipe.findFirst({
      where: { userId: user.id, title: { startsWith: "Receta " } },
      include: {
        ingredients: {
          include: {
            ingredient: { include: { variants: true, conversions: true } },
            variant: true,
            cookedVariant: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    expect(importedRecipe).not.toBeNull();
    expect(importedRecipe!.ingredients.length).toBeGreaterThan(0);

    const importedIngredient = importedRecipe!.ingredients[0].ingredient;
    expect(importedIngredient.variants.some((v) => v.name === "Cocinado")).toBe(
      true,
    );
    expect(
      importedIngredient.conversions.some((c) => c.unitName === "cucharada"),
    ).toBe(true);
    expect(importedIngredient.id).toBe(existingIngredient.id);
  });

  it("imports a single recipe JSON object exported from an individual recipe", async () => {
    const payload = {
      id: 999999,
      title: `Albóndigas importadas ${Date.now()}`,
      description: "Receta importada a partir de un JSON individual",
      instructions: "1. Preparar\n2. Cocinar",
      servings: 4,
      cookTimeMinutes: 30,
      difficulty: "media",
      isPublic: true,
      ingredients: [
        {
          name: "Carne picada",
          quantity: 500,
          unit: "g",
        },
      ],
      components: [],
    };

    const result = await recipeService.importFromJson([payload], user.id);

    expect(result.importedCount).toBe(1);
    expect(result.skipped).toEqual([]);
    const recipe = await prisma.recipe.findFirst({
      where: { userId: user.id, title: payload.title },
    });
    expect(recipe).not.toBeNull();
  });
});
