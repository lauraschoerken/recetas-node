import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Función para limpiar todas las tablas de la base de datos de test
export async function cleanDatabase() {
  const deleteOrder = [
    prisma.weekPlanSelection.deleteMany(),
    prisma.shoppingItem.deleteMany(),
    prisma.weekPlan.deleteMany(),
    prisma.homeItem.deleteMany(),
    prisma.recipeComponentOption.deleteMany(),
    prisma.recipeComponent.deleteMany(),
    prisma.recipeIngredient.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.unitConversion.deleteMany(),
    prisma.ingredientVariant.deleteMany(),
    prisma.ingredient.deleteMany(),
    prisma.user.deleteMany(),
  ];

  for (const deleteOp of deleteOrder) {
    try {
      await deleteOp;
    } catch (error) {
      // Ignorar errores de eliminación
    }
  }
}

// Función para limpiar datos creados por un usuario específico
export async function cleanUserData(userId: number) {
  try {
    await prisma.weekPlanSelection.deleteMany({
      where: { weekPlan: { userId } }
    });
    await prisma.shoppingItem.deleteMany({ where: { userId } });
    await prisma.weekPlan.deleteMany({ where: { userId } });
    await prisma.homeItem.deleteMany({ where: { userId } });
    await prisma.recipeComponentOption.deleteMany({
      where: { component: { recipe: { userId } } }
    });
    await prisma.recipeComponent.deleteMany({
      where: { recipe: { userId } }
    });
    await prisma.recipeIngredient.deleteMany({
      where: { recipe: { userId } }
    });
    await prisma.recipe.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    // Ignorar errores
  }
}

// Función para limpiar ingredientes huérfanos (sin uso en recetas)
export async function cleanOrphanIngredients() {
  try {
    // Eliminar variantes de ingredientes que no están en uso
    await prisma.ingredientVariant.deleteMany({
      where: {
        AND: [
          { recipeIngredientsPurchase: { none: {} } },
          { recipeIngredientsCooked: { none: {} } },
          { optionsPurchase: { none: {} } },
          { optionsCooked: { none: {} } },
          { homeItems: { none: {} } }
        ]
      }
    });

    // Eliminar ingredientes que no están en uso
    await prisma.ingredient.deleteMany({
      where: {
        AND: [
          { recipes: { none: {} } },
          { componentOptions: { none: {} } },
          { homeItems: { none: {} } },
          { shoppingItems: { none: {} } }
        ]
      }
    });
  } catch (error) {
    // Ignorar errores
  }
}

export { prisma };
