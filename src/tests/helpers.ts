import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cleanUserData, cleanOrphanIngredients } from './setup';

const prisma = new PrismaClient();

export interface TestUser {
  id: number;
  email: string;
  name: string;
  token: string;
}

// Almacenar IDs de usuarios e ingredientes creados para limpieza automática
const createdUserIds: Set<number> = new Set();
const createdIngredientIds: Set<number> = new Set();

export async function createTestUser(suffix: string = ''): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const email = `test_${suffix}_${timestamp}_${random}@test.com`;
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: `Test User ${suffix}`
    }
  });

  // Registrar para limpieza automática
  createdUserIds.add(user.id);

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token
  };
}

export async function cleanupTestUser(userId: number): Promise<void> {
  await cleanUserData(userId);
  createdUserIds.delete(userId);
  // Limpiar ingredientes huérfanos después de eliminar usuario
  await cleanOrphanIngredients();
}

export async function createTestIngredient(name: string = 'Test Ingredient'): Promise<number> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  const ingredient = await prisma.ingredient.create({
    data: {
      name: `test_${name.toLowerCase()}_${timestamp}_${random}`,
      unit: 'g'
    }
  });
  
  // Registrar para limpieza automática
  createdIngredientIds.add(ingredient.id);
  
  return ingredient.id;
}

export async function cleanupTestIngredient(ingredientId: number): Promise<void> {
  try {
    await prisma.ingredientVariant.deleteMany({ where: { ingredientId } });
    await prisma.unitConversion.deleteMany({ where: { ingredientId } });
    await prisma.ingredient.delete({ where: { id: ingredientId } });
    createdIngredientIds.delete(ingredientId);
  } catch (error) {
    // Ignorar errores
  }
}

// Limpiar todos los datos de test pendientes
export async function cleanupAllTestData(): Promise<void> {
  // Limpiar usuarios
  for (const userId of createdUserIds) {
    await cleanupTestUser(userId);
  }
  
  // Limpiar ingredientes
  for (const ingredientId of createdIngredientIds) {
    await cleanupTestIngredient(ingredientId);
  }
  
  // Limpiar ingredientes huérfanos
  await cleanOrphanIngredients();
}
