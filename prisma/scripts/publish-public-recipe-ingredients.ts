import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const result = await prisma.ingredient.updateMany({
    where: {
      status: { not: "GLOBAL" },
      OR: [
        { recipes: { some: { recipe: { isPublic: true } } } },
        {
          componentOptions: {
            some: { component: { recipe: { isPublic: true } } },
          },
        },
      ],
    },
    data: { status: "GLOBAL", createdByUserId: null },
  });

  console.log(
    `${result.count} ingrediente(s) de recetas públicas se han publicado para todos.`,
  );
}

main()
  .catch((error) => {
    console.error("No se pudieron publicar los ingredientes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
