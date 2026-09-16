import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index';
import prisma from '../config/prisma';

describe('Knowvia Organization-Wide Admin Overview Security & Metrics API', () => {
  jest.setTimeout(30000);

  let adminToken: string;
  let tutorToken: string;
  let internToken: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 12);

    // 1. Ensure Admin exists
    await prisma.user.upsert({
      where: { email: 'admin@knowvia.internal' },
      update: { isActive: true, deletedAt: null, firstName: 'NASCOM', lastName: '' },
      create: {
        email: 'admin@knowvia.internal',
        passwordHash,
        firstName: 'NASCOM',
        lastName: '',
        role: 'ADMIN',
        isActive: true,
      },
    });

    // 2. Ensure Tutor exists
    await prisma.user.upsert({
      where: { email: 'test-overview-tutor@knowvia.internal' },
      update: { isActive: true, deletedAt: null },
      create: {
        email: 'test-overview-tutor@knowvia.internal',
        passwordHash,
        firstName: 'Test',
        lastName: 'Tutor',
        role: 'TUTOR',
        isActive: true,
      },
    });

    // 3. Ensure Intern exists
    await prisma.user.upsert({
      where: { email: 'test-overview-intern@knowvia.internal' },
      update: { isActive: true, deletedAt: null },
      create: {
        email: 'test-overview-intern@knowvia.internal',
        passwordHash,
        firstName: 'Test',
        lastName: 'Intern',
        role: 'INTERN',
        isActive: true,
      },
    });

    // Obtain JWT Tokens
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@knowvia.internal', password: 'password123' });
    adminToken = adminRes.body.token;

    const tutorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test-overview-tutor@knowvia.internal', password: 'password123' });
    tutorToken = tutorRes.body.token;

    const internRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test-overview-intern@knowvia.internal', password: 'password123' });
    internToken = internRes.body.token;
  }, 30000);

  describe('Authorization Controls', () => {
    it('rejects unauthenticated request to /api/v1/admin/overview with 401', async () => {
      const res = await request(app).get('/api/v1/admin/overview');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/access token required/i);
    });

    it('rejects intern access to /api/v1/admin/overview with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${internToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('rejects tutor access to /api/v1/admin/overview with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('Admin Overview Data Integrity', () => {
    it('returns 200 and organization-wide metrics for authenticated administrator', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify metrics
      expect(res.body).toHaveProperty('metrics');
      const { metrics } = res.body;
      expect(typeof metrics.totalUsers).toBe('number');
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.activeInterns).toBe('number');
      expect(typeof metrics.activeTutors).toBe('number');
      expect(typeof metrics.activeDepartments).toBe('number');
      expect(metrics.activeDepartments).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.pendingOnboardingCount).toBe('number');
      expect(typeof metrics.pendingSubmissionsCount).toBe('number');
      expect(typeof metrics.upcomingSessionsCount).toBe('number');
      expect(typeof metrics.totalMaterialsCount).toBe('number');
      expect(typeof metrics.activeAssignmentsCount).toBe('number');

      // Verify departments breakdown
      expect(Array.isArray(res.body.departments)).toBe(true);
      expect(res.body.departments.length).toBeGreaterThanOrEqual(1);
      const firstDept = res.body.departments[0];
      expect(firstDept).toHaveProperty('id');
      expect(firstDept).toHaveProperty('name');
      expect(firstDept).toHaveProperty('slug');
      expect(firstDept).toHaveProperty('colorHex');
      expect(typeof firstDept.internCount).toBe('number');
      expect(typeof firstDept.tutorCount).toBe('number');
      expect(typeof firstDept.upcomingSessionsCount).toBe('number');
      expect(typeof firstDept.activeAssignmentsCount).toBe('number');
      expect(firstDept.status).toBe('Active');

      // Verify upcoming sessions array
      expect(Array.isArray(res.body.upcomingSessions)).toBe(true);

      // Verify attention items array
      expect(Array.isArray(res.body.attentionItems)).toBe(true);

      // Verify recent activity array
      expect(Array.isArray(res.body.recentActivity)).toBe(true);
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'test-overview-tutor@knowvia.internal',
            'test-overview-intern@knowvia.internal',
          ],
        },
      },
    });
    await prisma.$disconnect();
  });
});
