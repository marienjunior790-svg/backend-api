/**
 * Tests d'intégration nécessitant PostgreSQL + seed.
 * Exécution : npm run test:integration
 *
 * Prérequis :
 *   docker compose up -d
 *   DATABASE_URL=.../immo_tec npx prisma db seed
 */
import request from 'supertest';
import { createApp } from '../../src/app.js';

const describeIntegration = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Integration — Auth + DB', () => {
  const app = createApp();

  it('POST /auth/login avec compte seed', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@plenitude.cg', password: 'Admin123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@plenitude.cg');
    expect(res.body.data.subscription).toBeDefined();
  });

  it('GET /dashboard/stats avec token', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@plenitude.cg', password: 'Admin123!' });

    const token = login.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.apartments).toBeDefined();
  });
});
