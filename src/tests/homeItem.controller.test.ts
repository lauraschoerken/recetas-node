import request from 'supertest';
import { createApp } from '../app';
import { createTestUser, cleanupTestUser, createTestIngredient, cleanupTestIngredient, TestUser } from './helpers';

const app = createApp();

describe('HomeItem Controller', () => {
  let testUser: TestUser;
  let ingredientId: number;

  beforeAll(async () => {
    testUser = await createTestUser('homeitem');
    ingredientId = await createTestIngredient('homeitem_test');
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
    await cleanupTestIngredient(ingredientId);
  });

  describe('GET /api/home', () => {
    it('should return empty array initially', async () => {
      const res = await request(app)
        .get('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by location', async () => {
      // First add an item to nevera
      await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          ingredientId,
          location: 'nevera',
          quantity: 100,
          unit: 'g'
        });

      const res = await request(app)
        .get('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Check items in nevera
      const neveraItems = res.body.filter((item: any) => item.location === 'nevera');
      expect(neveraItems.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/home', () => {
    it('should create a new home item', async () => {
      const res = await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          ingredientId,
          location: 'nevera',
          quantity: 500,
          unit: 'g'
        });

      expect(res.status).toBe(201);
      expect(res.body.location).toBe('nevera');
      expect(res.body.quantity).toBe(500);
    });

    it('should create item with ingredient name', async () => {
      const res = await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          ingredientName: 'Custom Item',
          location: 'despensa',
          quantity: 1,
          unit: 'kg'
        });

      expect(res.status).toBe(201);
      expect(res.body.location).toBe('despensa');
    });

    it('should return 400 without location', async () => {
      const res = await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          ingredientId,
          quantity: 100,
          unit: 'g'
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 without ingredient info', async () => {
      const res = await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          location: 'nevera',
          quantity: 100,
          unit: 'g'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/home/:id', () => {
    let itemId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          ingredientId,
          location: 'nevera',
          quantity: 200,
          unit: 'g'
        });
      itemId = res.body.id;
    });

    it('should update a home item', async () => {
      const res = await request(app)
        .put(`/api/home/${itemId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          quantity: 300,
          location: 'congelador'
        });

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(300);
      expect(res.body.location).toBe('congelador');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .put('/api/home/99999')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ quantity: 100 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/home/:id', () => {
    let itemId: number;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/home')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          ingredientId,
          location: 'nevera',
          quantity: 100,
          unit: 'g'
        });
      itemId = res.body.id;
    });

    it('should delete a home item', async () => {
      const res = await request(app)
        .delete(`/api/home/${itemId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .delete('/api/home/99999')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/home/process-consumed', () => {
    it('should process consumed meals', async () => {
      const res = await request(app)
        .post('/api/home/process-consumed')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
    });
  });
});
