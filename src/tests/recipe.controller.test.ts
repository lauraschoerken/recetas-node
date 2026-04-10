import request from 'supertest';
import { createApp } from '../app';
import { createTestUser, cleanupTestUser, createTestIngredient, cleanupTestIngredient, TestUser } from './helpers';

const app = createApp();

describe('Recipe Controller', () => {
  let testUser: TestUser;
  let ingredientId: number;

  beforeAll(async () => {
    testUser = await createTestUser('recipe');
    ingredientId = await createTestIngredient('recipe_test');
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
    await cleanupTestIngredient(ingredientId);
  });

  describe('GET /api/recipes', () => {
    it('should return empty array initially', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/recipes');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/recipes', () => {
    it('should create a new recipe', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Test Recipe',
          description: 'A test recipe',
          servings: 4,
          ingredients: [
            { name: `test_ing_${timestamp}`, quantity: 100, unit: 'g' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Test Recipe');
      expect(res.body.servings).toBe(4);
    });

    it('should return 400 without title', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          description: 'Missing title',
          ingredients: []
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 without ingredients', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'No ingredients recipe'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/recipes/:id', () => {
    let recipeId: number;

    beforeAll(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Recipe to Get',
          ingredients: [{ name: `get_ing_${timestamp}`, quantity: 50, unit: 'g' }]
        });
      recipeId = res.body.id;
    });

    it('should return a recipe by id', async () => {
      const res = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(recipeId);
      expect(res.body.title).toBe('Recipe to Get');
    });

    it('should return 404 for non-existent recipe', async () => {
      const res = await request(app)
        .get('/api/recipes/99999')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/recipes/:id', () => {
    let recipeId: number;

    beforeAll(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Recipe to Update',
          ingredients: [{ name: `update_ing_${timestamp}`, quantity: 50, unit: 'g' }]
        });
      recipeId = res.body.id;
    });

    it('should update a recipe', async () => {
      const res = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Updated Recipe Title',
          servings: 6
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Recipe Title');
      expect(res.body.servings).toBe(6);
    });

    it('should return 404 for non-existent recipe', async () => {
      const res = await request(app)
        .put('/api/recipes/99999')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    let recipeId: number;

    beforeEach(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Recipe to Delete',
          ingredients: [{ name: `delete_ing_${timestamp}`, quantity: 50, unit: 'g' }]
        });
      recipeId = res.body.id;
    });

    it('should delete a recipe', async () => {
      const res = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);

      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent recipe', async () => {
      const res = await request(app)
        .delete('/api/recipes/99999')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });
});
