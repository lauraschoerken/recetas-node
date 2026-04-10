import { JsonController, Post, Body, HttpCode, OnUndefined } from 'routing-controllers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupRequest {
  userId?: number;
  email?: string;
  secret?: string;
}

@JsonController('/test')
export class TestController {
  
  private isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_ENDPOINTS === 'true';
  }

  @Post('/cleanup')
  @HttpCode(200)
  async cleanup(@Body() body: CleanupRequest) {
    if (!this.isTestEnvironment()) {
      return { error: 'Test endpoints not available in production' };
    }

    // Verificar secreto para prevenir uso accidental
    if (body.secret !== 'cypress-test-secret') {
      return { error: 'Invalid secret' };
    }

    try {
      if (body.userId) {
        await this.cleanupUser(body.userId);
        return { success: true, message: `User ${body.userId} cleaned up` };
      }

      if (body.email) {
        const user = await prisma.user.findUnique({ where: { email: body.email } });
        if (user) {
          await this.cleanupUser(user.id);
          return { success: true, message: `User ${body.email} cleaned up` };
        }
        return { success: true, message: 'User not found, nothing to clean' };
      }

      return { error: 'userId or email required' };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { error: 'Cleanup failed', details: String(error) };
    }
  }

  @Post('/cleanup-all-test-data')
  @HttpCode(200)
  async cleanupAllTestData(@Body() body: { secret?: string }) {
    if (!this.isTestEnvironment()) {
      return { error: 'Test endpoints not available in production' };
    }

    if (body.secret !== 'cypress-test-secret') {
      return { error: 'Invalid secret' };
    }

    try {
      // Eliminar usuarios de test (emails que contienen test o cypress)
      const testUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: 'test' } },
            { email: { contains: 'cypress' } },
            { email: { endsWith: '@test.com' } }
          ]
        }
      });

      for (const user of testUsers) {
        await this.cleanupUser(user.id);
      }

      // Eliminar ingredientes de test
      await this.cleanupTestIngredients();

      return { 
        success: true, 
        message: `Cleaned up ${testUsers.length} test users and test ingredients` 
      };
    } catch (error) {
      console.error('Cleanup all error:', error);
      return { error: 'Cleanup failed', details: String(error) };
    }
  }

  @Post('/cleanup-test-ingredients')
  @HttpCode(200)
  async cleanupTestIngredientsEndpoint(@Body() body: { secret?: string }) {
    if (!this.isTestEnvironment()) {
      return { error: 'Test endpoints not available in production' };
    }

    if (body.secret !== 'cypress-test-secret') {
      return { error: 'Invalid secret' };
    }

    try {
      const count = await this.cleanupTestIngredients();
      return { success: true, message: `Cleaned up ${count} test ingredients` };
    } catch (error) {
      console.error('Cleanup ingredients error:', error);
      return { error: 'Cleanup failed', details: String(error) };
    }
  }

  private async cleanupUser(userId: number): Promise<void> {
    // Eliminar en orden correcto respetando foreign keys
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
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  }

  private async cleanupTestIngredients(): Promise<number> {
    // Encontrar ingredientes de test (nombres que empiezan con test_ o contienen timestamp patterns)
    const testIngredients = await prisma.ingredient.findMany({
      where: {
        OR: [
          { name: { startsWith: 'test_' } },
          { name: { startsWith: 'Test' } },
          { name: { contains: '_ing_' } },
          { name: { matches: '.*\\d{13}.*' } } // Contiene timestamp de 13 dígitos
        ]
      }
    });

    // Solo eliminar ingredientes que no están en uso
    let deletedCount = 0;
    for (const ingredient of testIngredients) {
      try {
        // Verificar si está en uso
        const inUse = await prisma.recipeIngredient.findFirst({
          where: { ingredientId: ingredient.id }
        });
        
        if (!inUse) {
          await prisma.ingredientVariant.deleteMany({ where: { ingredientId: ingredient.id } });
          await prisma.unitConversion.deleteMany({ where: { ingredientId: ingredient.id } });
          await prisma.ingredient.delete({ where: { id: ingredient.id } });
          deletedCount++;
        }
      } catch (e) {
        // Ignorar errores individuales
      }
    }

    return deletedCount;
  }
}
