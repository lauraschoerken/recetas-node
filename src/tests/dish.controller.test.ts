import request from 'supertest';
import { createApp } from '../app';
import { createTestUser, cleanupTestUser, createTestIngredient, cleanupTestIngredient, TestUser } from './helpers';
import { PrismaClient } from '@prisma/client';

const app = createApp();
const prisma = new PrismaClient();

describe('Dish Controller', () => {
  let testUser: TestUser;
  let ingredientId: number;
  let recipeId: number;

  beforeAll(async () => {
    testUser = await createTestUser('dish');
    ingredientId = await createTestIngredient('dish_test');
    
    // Create a recipe for dish options
    const recipe = await prisma.recipe.create({
      data: {
        title: 'Recipe for Dish',
        servings: 4,
        userId: testUser.id
      }
    });
    recipeId = recipe.id;
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
    await cleanupTestIngredient(ingredientId);
  });

  describe('GET /api/dishes', () => {
    it('should return empty array initially', async () => {
      const res = await request(app)
        .get('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/dishes');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/dishes', () => {
    it('should create a new dish', async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Dish',
          description: 'A test dish',
          servings: 2,
          slots: [
            {
              name: 'Main',
              options: [
                { name: 'Option 1', recipeId, isDefault: true }
              ]
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Dish');
      expect(res.body.slots).toHaveLength(1);
    });

    it('should return 400 without name', async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          slots: []
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 without slots', async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'No slots dish'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/dishes/:id', () => {
    let dishId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Dish to Get',
          slots: [{ name: 'Slot', options: [{ name: 'Opt', recipeId, isDefault: true }] }]
        });
      dishId = res.body.id;
    });

    it('should return a dish by id', async () => {
      const res = await request(app)
        .get(`/api/dishes/${dishId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(dishId);
    });

    it('should return 404 for non-existent dish', async () => {
      const res = await request(app)
        .get('/api/dishes/99999')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/dishes/:id', () => {
    let dishId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Dish to Update',
          slots: [{ name: 'Slot', options: [{ name: 'Opt', recipeId, isDefault: true }] }]
        });
      dishId = res.body.id;
    });

    it('should update a dish', async () => {
      const res = await request(app)
        .put(`/api/dishes/${dishId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Updated Dish Name',
          servings: 6
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Dish Name');
    });
  });

  describe('DELETE /api/dishes/:id', () => {
    let dishId: number;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Dish to Delete',
          slots: [{ name: 'Slot', options: [{ name: 'Opt', recipeId, isDefault: true }] }]
        });
      dishId = res.body.id;
    });

    it('should delete a dish', async () => {
      const res = await request(app)
        .delete(`/api/dishes/${dishId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent dish', async () => {
      const res = await request(app)
        .delete('/api/dishes/99999')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });
});
