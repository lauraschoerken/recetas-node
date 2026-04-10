import request from 'supertest';
import { createApp } from '../app';
import { createTestUser, cleanupTestUser, TestUser } from './helpers';

const app = createApp();

describe('Auth Controller', () => {
  let testUser: TestUser;

  afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `newuser${timestamp}@test.com`,
          password: 'password123',
          name: 'New User'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(`newuser${timestamp}@test.com`);

      // Cleanup
      testUser = { ...res.body.user, token: res.body.token };
    });

    it('should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@test.com'
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if email already exists', async () => {
      testUser = await createTestUser('duplicate');
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: 'password123',
          name: 'Duplicate User'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      testUser = await createTestUser('login');
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
    });

    it('should return 401 with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      testUser = await createTestUser('me');
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testUser.id);
      expect(res.body.email).toBe(testUser.email);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
