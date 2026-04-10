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

    it('should return 400 without dates', async () => {
      const res = await request(app)
        .get('/api/shopping-list')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(400);
    });
  });
});
