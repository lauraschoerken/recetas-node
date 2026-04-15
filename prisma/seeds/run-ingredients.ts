/**
 * Seed masivo de ingredientes.
 *
 * Ejecutar con:
 *   npx ts-node prisma/seeds/run-ingredients.ts
 *
 * O añadir al package.json:
 *   "seed:ingredients": "ts-node prisma/seeds/run-ingredients.ts"
 *
 * Este script hace UPSERT de todos los ingredientes, sus variantes y
 * conversiones de unidades, sin eliminar datos existentes no incluidos aquí.
 *
 * La normalización de nombres sigue el mismo patrón que el servicio:
 * primera letra en mayúscula, resto en minúsculas.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { allIngredients } from './ingredients';

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

async function main() {
  console.log(`Iniciando seed de ingredientes (${allIngredients.length} ingredientes)...`);

  let creados = 0;
  let actualizados = 0;
  let variantesUpserted = 0;
  let conversionesUpserted = 0;

  for (const data of allIngredients) {
    const name = normalizeName(data.name);

    // ── 1. Upsert del ingrediente ─────────────────────────────────────────
    const existing = await prisma.ingredient.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    let ingredient: { id: number };

    if (existing) {
      ingredient = await prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          unit: data.unit,
          ...(data.preferredUnit !== undefined && { preferredUnit: data.preferredUnit }),
          ...(data.defaultLocation !== undefined && { defaultLocation: data.defaultLocation }),
        },
      });
      actualizados++;
    } else {
      ingredient = await prisma.ingredient.create({
        data: {
          name,
          unit: data.unit,
          preferredUnit: data.preferredUnit ?? null,
          defaultLocation: data.defaultLocation ?? null,
        },
      });
      creados++;
    }

    // ── 2. Upsert de variantes ────────────────────────────────────────────
    for (const variant of data.variants) {
      // Si el nombre objetivo es 'Crudo', también encontrar variantes con
      // nombres previos inconsistentes: 'Cruda', 'Crudas', 'Crudos'
      const existingVariant = await prisma.ingredientVariant.findFirst({
        where: {
          ingredientId: ingredient.id,
          OR: [
            { name: { equals: variant.name, mode: 'insensitive' } },
            ...(variant.name.toLowerCase() === 'crudo'
              ? [{ name: { startsWith: 'crud', mode: Prisma.QueryMode.insensitive } }]
              : []),
          ],
        },
      });

      const variantData = {
        name: variant.name,
        isDefault: variant.isDefault,
        calories: variant.calories,
        protein: variant.protein,
        carbs: variant.carbs,
        fat: variant.fat,
        fiber: variant.fiber,
        weightFactor: variant.weightFactor ?? 1.0,
      };

      if (existingVariant) {
        await prisma.ingredientVariant.update({
          where: { id: existingVariant.id },
          data: variantData,
        });
      } else {
        await prisma.ingredientVariant.create({
          data: { ...variantData, ingredientId: ingredient.id },
        });
      }
      variantesUpserted++;
    }

    // ── 3. Upsert de conversiones de unidades ─────────────────────────────
    for (const conv of data.conversions) {
      await prisma.unitConversion.upsert({
        where: {
          ingredientId_unitName: {
            ingredientId: ingredient.id,
            unitName: conv.unitName,
          },
        },
        update: { gramsPerUnit: conv.gramsPerUnit },
        create: {
          ingredientId: ingredient.id,
          unitName: conv.unitName,
          gramsPerUnit: conv.gramsPerUnit,
        },
      });
      conversionesUpserted++;
    }
  }

  console.log('────────────────────────────────────────────');
  console.log(`✅ Ingredientes creados:      ${creados}`);
  console.log(`📝 Ingredientes actualizados: ${actualizados}`);
  console.log(`🔬 Variantes procesadas:      ${variantesUpserted}`);
  console.log(`⚖️  Conversiones procesadas:   ${conversionesUpserted}`);
  console.log('────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
