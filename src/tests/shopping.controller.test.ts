import request from 'supertest';
import { createApp } from '../app';
import { createTestUser, cleanupTestUser, createTestIngredient, cleanupTestIngredient, TestUser } from './helpers';
import { PrismaClient } from '@prisma/client';

const app = createApp();
const prisma = new PrismaClient();

describe('Shopping Controller', () => {
  let testUser: TestUser;
  let ingredientId: number;
  let recipeId: number;

  beforeAll(async () => {
    testUser = await createTestUser('shopping');
    ingredientId = await createTestIngredient('shopping_test');
    
    // Create a recipe
    const recipe = await prisma.recipe.create({
      data: {
        title: 'Recipe for Shopping',
        servings: 4,
        userId: testUser.id,
        ingredients: {
          create: {
            ingredientId,
            quantity: 100,
            unit: 'g'
          }
        }
      }
    });
    recipeId = recipe.id;
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
    await cleanupTestIngredient(ingredientId);
  });

  describe('GET /api/week-plan', () => {
    it('should return week plan', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/week-plan?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 400 without dates', async () => {
      const res = await request(app)
        .get('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/week-plan', () => {
    it('should add recipe to week plan', async () => {
      const plannedDate = new Date().toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          recipeId,
          plannedDate,
          servings: 2,
          type: 'meal'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 without recipeId or dishId', async () => {
      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          plannedDate: new Date().toISOString().split('T')[0]
        });

      expect(res.status).toBe(400);
    });

    it('should add a consumed manual meal without recipe or ingredient', async () => {
      const plannedDate = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          plannedDate,
          manualTitle: 'Desayuno fuera de casa',
          mealTime: '09:15',
          manualCalories: 420,
          manualProtein: 18,
          consumed: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.manualTitle).toBe('Desayuno fuera de casa');
      expect(res.body.manualCalories).toBe(420);
      expect(res.body.mealTime).toBe('09:15');
      expect(res.body.consumed).toBe(true);
      expect(res.body.recipeId).toBeNull();
      expect(res.body.ingredientId).toBeNull();
    });

    it('should return 400 without plannedDate', async () => {
      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          recipeId
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/week-plan/import', () => {
    it('should import manual, recipe and ingredient entries together', async () => {
      const date = new Date().toISOString().split('T')[0];
      const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
      const res = await request(app)
        .post('/api/week-plan/import')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          entries: [
            { kind: 'manual', date, time: '08:00', title: 'Café y tostadas', calories: 300 },
            { kind: 'recipe', date, recipeTitle: 'Recipe for Shopping', servings: 1 },
            { kind: 'ingredient', date, ingredientName: ingredient!.name, quantity: 100, unit: 'g' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.importedCount).toBe(3);
      expect(res.body.entries).toHaveLength(3);
      expect(res.body.entries.every((entry: any) => entry.consumed)).toBe(true);
    });

    it('should report the row when an imported reference does not exist', async () => {
      const date = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/week-plan/import')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ entries: [{ kind: 'recipe', date, recipeTitle: 'No existe' }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('fila 1');
      expect(res.body.error).toContain('Receta no encontrada');
    });
  });

  describe('PUT /api/week-plan/:id', () => {
    let planId: number;

    beforeAll(async () => {
      const plannedDate = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ recipeId, plannedDate, servings: 2 });
      planId = res.body.id;
    });

    it('should update plan date', async () => {
      const newDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .put(`/api/week-plan/${planId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ plannedDate: newDate });

      expect(res.status).toBe(200);
    });

    it('should return 400 without plannedDate', async () => {
      const res = await request(app)
        .put(`/api/week-plan/${planId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/week-plan/:id', () => {
    let planId: number;

    beforeEach(async () => {
      const plannedDate = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ recipeId, plannedDate, servings: 2 });
      planId = res.body.id;
    });

    it('should remove from week plan', async () => {
      const res = await request(app)
        .delete(`/api/week-plan/${planId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent plan', async () => {
      const res = await request(app)
        .delete('/api/week-plan/99999')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/week-plan/:id/cook', () => {
    let planId: number;

    beforeAll(async () => {
      const plannedDate = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/week-plan')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ recipeId, plannedDate, servings: 4, type: 'prep' });
      planId = res.body.id;
    });

    it('should mark as cooked', async () => {
      const res = await request(app)
        .post(`/api/week-plan/${planId}/cook`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ leftoverServings: 2, leftoverLocation: 'nevera' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/shopping-list', () => {
    it('should return shopping list', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/shopping-list?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return pending items without requiring dates', async () => {
      const res = await request(app)
        .get('/api/shopping-list')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should merge manual quantities without changing their physical amount', async () => {
      await prisma.unitConversion.upsert({
        where: { ingredientId_unitName: { ingredientId, unitName: 'kg' } },
        create: { ingredientId, unitName: 'kg', gramsPerUnit: 1000 },
        update: { gramsPerUnit: 1000 },
      });
      await prisma.ingredient.update({
        where: { id: ingredientId },
        data: { preferredUnit: 'kg' },
      });

      for (const item of [
        { quantity: 1000, unit: 'g' },
        { quantity: 1, unit: 'kg' },
      ]) {
        const addRes = await request(app)
          .post('/api/shopping-list/add')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({ items: [{ ingredientId, ...item }] });
        expect(addRes.status).toBe(201);
      }

      const stored = await prisma.shoppingItem.findFirst({
        where: { userId: testUser.id, ingredientId, weekPlanId: null, purchased: false },
      });
      expect(stored?.quantity).toBe(2000);
      expect(stored?.unit).toBe('g');

      const res = await request(app)
        .get('/api/shopping-list')
        .set('Authorization', `Bearer ${testUser.token}`);
      const item = res.body.find((entry: { ingredientId: number }) => entry.ingredientId === ingredientId);
      expect(item.manualQuantity).toBe(2000);
      expect(item.preferredUnit).toBe('kg');
      expect(item.preferredQuantity).toBeCloseTo(item.quantityToBuy / 1000, 3);
    });
  });
});
