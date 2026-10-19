import request from 'supertest';
import { createApp } from '../app';
import { cleanupTestUser, createTestUser, TestUser } from './helpers';

const app = createApp();

describe('Entrenamientos', () => {
  let user: TestUser;

  beforeEach(async () => { user = await createTestUser('workout'); });
  afterEach(async () => { await cleanupTestUser(user.id); });

  it('registra una sesión y solo suma calorías al objetivo cuando se activa', async () => {
    const create = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        title: 'Fuerza y carrera',
        performedAt: '2026-10-19T12:00:00',
        durationMinutes: 50,
        caloriesBurned: 420,
        averageHeartRate: 138,
        exercises: '2 series de sentadillas\nCorrer 2 km',
        addCaloriesToGoal: false,
      });

    expect(create.status).toBe(200);
    expect(create.body).toMatchObject({ title: 'Fuerza y carrera', addCaloriesToGoal: false });

    const nutrition = await request(app)
      .get('/api/profile/weekly-nutrition?startDate=2026-10-19&endDate=2026-10-19')
      .set('Authorization', `Bearer ${user.token}`);
    expect(nutrition.body.days[0]).toMatchObject({ exerciseCalories: 420, calorieTargetAdjustment: 0 });

    await request(app)
      .put(`/api/workouts/${create.body.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ ...create.body, performedAt: '2026-10-19T12:00:00', addCaloriesToGoal: true });

    const adjusted = await request(app)
      .get('/api/profile/weekly-nutrition?startDate=2026-10-19&endDate=2026-10-19')
      .set('Authorization', `Bearer ${user.token}`);
    expect(adjusted.body.days[0].calorieTargetAdjustment).toBe(420);
  });

  it('calcula la edad desde la fecha de nacimiento', async () => {
    const response = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ birthDate: '2000-10-20' });

    expect(response.status).toBe(200);
    expect(response.body.birthDate).toBe('2000-10-20');
    expect(response.body.age).toBeGreaterThanOrEqual(25);
  });

  it('importa una plantilla guardada y una sesión personalizada desde el mismo JSON', async () => {
    const response = await request(app)
      .post('/api/workouts/import')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        templates: [{
          title: 'Pierna y carrera', durationMinutes: 55, caloriesBurned: 430,
          exercises: '3 series de sentadillas\nCorrer 2 km', defaultAddCaloriesToGoal: false,
        }],
        entries: [
          { kind: 'template', date: '2026-10-19', templateTitle: 'Pierna y carrera', addCaloriesToGoal: true },
          { kind: 'custom', date: '2026-10-20', title: 'Paseo', durationMinutes: 60, caloriesBurned: 240 },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ templatesImported: 1, importedCount: 2 });
    expect(response.body.entries[0]).toMatchObject({ title: 'Pierna y carrera', caloriesBurned: 430, addCaloriesToGoal: true });
    expect(response.body.entries[0].templateId).not.toBeNull();
    expect(response.body.entries[1]).toMatchObject({ title: 'Paseo', templateId: null });
  });
});
