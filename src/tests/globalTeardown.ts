import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export default async function globalTeardown() {
  console.log('\n🧹 Limpiando base de datos de test...');
  
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    
    // Eliminar todos los datos en orden correcto (respetando foreign keys)
    await prisma.weekPlanSelection.deleteMany();
    await prisma.shoppingItem.deleteMany();
    await prisma.weekPlan.deleteMany();
    await prisma.homeItem.deleteMany();
    await prisma.recipeComponentOption.deleteMany();
    await prisma.recipeComponent.deleteMany();
    await prisma.recipeIngredient.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.unitConversion.deleteMany();
    await prisma.ingredientVariant.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Base de datos de test limpiada');
  } catch (error) {
    console.error('⚠️  Error limpiando base de datos de test:', error);
  } finally {
    await prisma.$disconnect();
  }
}
