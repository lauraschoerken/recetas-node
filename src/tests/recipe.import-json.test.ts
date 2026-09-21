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

  it("does not auto-create an ingredient unless the user explicitly chooses a new one", async () => {
    const title = `Receta sin resolver ${Date.now()}`;
    const ingredientName = `Ingrediente sin resolver ${Date.now()}`;

    await expect(
      recipeService.importFromJson(
        [
          {
            title,
            servings: 2,
            ingredients: [{ name: ingredientName, quantity: 200, unit: "g" }],
          },
        ],
        user.id,
      ),
    ).rejects.toThrow(/no existe y no se ha marcado como nuevo/i);

    const createdIngredient = await prisma.ingredient.findFirst({
      where: { name: { equals: ingredientName, mode: "insensitive" } },
    });
    expect(createdIngredient).toBeNull();
  });

  it("reuses the selected existing ingredient instead of creating a duplicate one", async () => {
    const targetName = `Huevo normal ${Date.now()}`;
    const existingIngredient = await prisma.ingredient.create({
      data: {
        name: targetName,
        unit: "ud",
        status: "GLOBAL",
        variants: {
          create: [{ name: "Crudo", isDefault: true, weightFactor: 1 }],
        },
      },
    });

    const payload = {
      title: `Huevo importado ${Date.now()}`,
      servings: 2,
      ingredients: [
        {
          name: "Huevo grande",
          quantity: 2,
          unit: "ud",
          variantName: "Crudo",
        },
      ],
    };

    const result = await recipeService.importFromJson([payload], user.id, {
      [`${payload.title}|0|huevo grande|new`]: {
        ingredientId: existingIngredient.id,
        name: targetName,
      },
    });

    expect(result.importedCount).toBe(1);

    const recipe = await prisma.recipe.findFirst({
      where: { userId: user.id, title: payload.title },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });

    expect(recipe).not.toBeNull();
    expect(recipe!.ingredients[0].ingredientId).toBe(existingIngredient.id);
    expect(recipe!.ingredients[0].ingredient.name).toBe(targetName);

    const count = await prisma.ingredient.count({
      where: { name: { contains: "Huevo grande", mode: "insensitive" } },
    });
    expect(count).toBe(0);
  });

  it("marks an unresolved ingredient as a review conflict even when there are no candidate matches", async () => {
    const review = await recipeService.reviewImportJson(
      [
        {
          title: `Leche importada ${Date.now()}`,
          servings: 2,
          ingredients: [{ name: "Leche condensada", quantity: 200, unit: "g" }],
        },
      ],
      user.id,
    );

    expect(review.needsReview).toBe(true);
    expect(review.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientName: "Leche condensada",
          candidates: expect.any(Array),
        }),
      ]),
    );
  });

  it("reviews ingredients nested in components and child recipes before import", async () => {
    const review = await recipeService.reviewImportJson(
      [
        {
          title: `Receta anidada ${Date.now()}`,
          servings: 2,
          ingredients: [{ name: "Huevo", quantity: 2, unit: "ud" }],
          components: [
            {
              name: "Salsa",
              options: [
                {
                  name: "Salsa base",
                  ingredientName: "Leche condensada",
                  quantity: 200,
                  unit: "g",
                },
                {
                  name: "Receta interna",
                  recipe: {
                    title: `Subreceta ${Date.now()}`,
                    servings: 1,
                    ingredients: [
                      { name: "Pan rallado", quantity: 50, unit: "g" },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
      user.id,
    );

    expect(review.needsReview).toBe(true);
    expect(review.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ingredientName: "Huevo" }),
        expect.objectContaining({ ingredientName: "Leche condensada" }),
        expect.objectContaining({ ingredientName: "Pan rallado" }),
      ]),
    );
  });

  it("does not reuse another user's private ingredient when importing by name", async () => {
    const ownerTwo = await createTestUser(
      `recipe_import_owner_2_${Date.now()}`,
    );
    const ownerFour = await createTestUser(
      `recipe_import_owner_4_${Date.now()}`,
    );

    try {
      const otherUserIngredient = await prisma.ingredient.create({
        data: {
          name: `Arroz importado ${Date.now()}`,
          unit: "g",
          status: "PRIVATE",
          createdByUserId: ownerFour.id,
          variants: {
            create: [{ name: "Crudo", isDefault: true, weightFactor: 1 }],
          },
        },
      });

      const review = await recipeService.reviewImportJson(
        [
          {
            title: `Receta de otro usuario ${Date.now()}`,
            servings: 2,
            ingredients: [
              { name: otherUserIngredient.name, quantity: 200, unit: "g" },
            ],
          },
        ],
        ownerTwo.id,
      );

      expect(review.needsReview).toBe(true);
      expect(
        review.conflicts.some(
          (c) => c.ingredientName === otherUserIngredient.name,
        ),
      ).toBe(true);

      await expect(
        recipeService.importFromJson(
          [
            {
              title: `Receta de otro usuario ${Date.now()}`,
              servings: 2,
              ingredients: [
                { name: otherUserIngredient.name, quantity: 200, unit: "g" },
              ],
            },
          ],
          ownerTwo.id,
        ),
      ).rejects.toThrow(
        /no existe y no se ha marcado como nuevo|no se ha marcado como nuevo/i,
      );
    } finally {
      await cleanupTestUser(ownerTwo.id);
      await cleanupTestUser(ownerFour.id);
    }
  });

  it("deduplicates the same ingredient name within the same recipe in review", async () => {
    const review = await recipeService.reviewImportJson(
      [
        {
          title: `Receta duplicada ${Date.now()}`,
          servings: 2,
          ingredients: [
            { name: "Huevo", quantity: 2, unit: "ud" },
            { name: "Huevo", quantity: 3, unit: "ud" },
          ],
        },
      ],
      user.id,
    );

    const filtered = review.conflicts.filter(
      (c) => c.ingredientName === "Huevo",
    );
    expect(filtered.length).toBe(1);
  });

  it("imports a single recipe JSON object only when the user explicitly chooses to create the ingredient", async () => {
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
          variants: [{ name: "Crudo", isDefault: true, weightFactor: 1 }],
          conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
        },
      ],
      components: [],
    };

    const key = `${payload.title}|0|Carne picada|new`;
    const result = await recipeService.importFromJson([payload], user.id, {
      [key]: { name: "Carne picada", createNew: true },
    });

    expect(result.importedCount).toBe(1);
    expect(result.skipped).toEqual([]);

    const recipe = await prisma.recipe.findFirst({
      where: { userId: user.id, title: payload.title },
    });
    expect(recipe).not.toBeNull();

    const ingredient = await prisma.ingredient.findFirst({
      where: { name: { equals: "Carne picada", mode: "insensitive" } },
      include: { variants: true, conversions: true },
    });
    expect(ingredient).not.toBeNull();
    expect(ingredient?.unit).toBe("g");
    expect(ingredient?.variants.some((v) => v.name === "Crudo")).toBe(true);
    expect(ingredient?.conversions.some((c) => c.unitName === "kg")).toBe(true);
  });
});
