import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index';
import prisma from '../config/prisma';

describe('Knowvia Announcement Pin and Unpin API', () => {
  jest.setTimeout(30000);

  let adminToken: string;
  let tutorToken: string;
  let internToken: string;
  let testDeptSlug: string;
  let testDeptId: string;
  let testAnnouncementId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 12);

    // 1. Ensure Admin exists
    const admin = await prisma.user.upsert({
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

    // 2. Ensure Test Department exists
    const dept = await prisma.department.upsert({
      where: { slug: 'test-pin-dept' },
      update: { isActive: true },
      create: {
        name: 'Test Pin Department',
        slug: 'test-pin-dept',
        description: 'Department for testing announcement pin/unpin',
        icon: 'book-open',
        colorHex: '#6366f1',
        isActive: true,
      },
    });
    testDeptSlug = dept.slug;
    testDeptId = dept.id;

    // 3. Ensure Tutor exists and is a member of the department
    const tutor = await prisma.user.upsert({
      where: { email: 'test-pin-tutor@knowvia.internal' },
      update: { isActive: true, deletedAt: null },
      create: {
        email: 'test-pin-tutor@knowvia.internal',
        passwordHash,
        firstName: 'Test',
        lastName: 'Tutor',
        role: 'TUTOR',
        isActive: true,
      },
    });

    await prisma.departmentMember.upsert({
      where: {
        userId_departmentId: {
          userId: tutor.id,
          departmentId: dept.id,
        },
      },
      update: { status: 'APPROVED', role: 'TUTOR' },
      create: {
        userId: tutor.id,
        departmentId: dept.id,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });

    // 4. Ensure Intern exists and is a member
    const intern = await prisma.user.upsert({
      where: { email: 'test-pin-intern@knowvia.internal' },
      update: { isActive: true, deletedAt: null },
      create: {
        email: 'test-pin-intern@knowvia.internal',
        passwordHash,
        firstName: 'Test',
        lastName: 'Intern',
        role: 'INTERN',
        isActive: true,
      },
    });

    await prisma.departmentMember.upsert({
      where: {
        userId_departmentId: {
          userId: intern.id,
          departmentId: dept.id,
        },
      },
      update: { status: 'APPROVED', role: 'INTERN' },
      create: {
        userId: intern.id,
        departmentId: dept.id,
        role: 'INTERN',
        status: 'APPROVED',
      },
    });

    // 5. Create a test pinned announcement
    const ann = await prisma.announcement.create({
      data: {
        title: 'Initial Pinned Test Announcement',
        content: 'Testing pin and unpin mechanics',
        departmentId: dept.id,
        authorId: tutor.id,
        priority: 'IMPORTANT',
        isPinned: true,
      },
    });
    testAnnouncementId = ann.id;

    // Login tokens
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@knowvia.internal', password: 'password123' });
    adminToken = adminRes.body.token;

    const tutorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test-pin-tutor@knowvia.internal', password: 'password123' });
    tutorToken = tutorRes.body.token;

    const internRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test-pin-intern@knowvia.internal', password: 'password123' });
    internToken = internRes.body.token;
  });

  afterAll(async () => {
    // Clean up created test entities
    try {
      if (testAnnouncementId) {
        await prisma.dismissedAnnouncement.deleteMany({ where: { announcementId: testAnnouncementId } });
        await prisma.announcement.deleteMany({ where: { id: testAnnouncementId } });
      }
      await prisma.announcement.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.departmentMember.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.department.deleteMany({ where: { id: testDeptId } });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['test-pin-tutor@knowvia.internal', 'test-pin-intern@knowvia.internal'],
          },
        },
      });
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  });

  describe('Security & Authorization for Pinning', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${testDeptSlug}/announcements/${testAnnouncementId}/pin`);
      expect(res.status).toBe(401);
    });

    it('rejects intern role from pinning/unpinning with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${testDeptSlug}/announcements/${testAnnouncementId}/pin`)
        .set('Authorization', `Bearer ${internToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('returns 404 if announcement does not exist', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${testDeptSlug}/announcements/00000000-0000-0000-0000-000000000000/pin`)
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Announcement not found/i);
    });
  });

  describe('Tutor & Admin Unpin/Pin Functionality', () => {
    it('allows a tutor to unpin an existing pinned announcement', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${testDeptSlug}/announcements/${testAnnouncementId}/pin`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('announcement');
      expect(res.body.announcement.isPinned).toBe(false);
      expect(res.body.message).toMatch(/unpinned successfully/i);

      // Verify in DB
      const dbAnn = await prisma.announcement.findUnique({ where: { id: testAnnouncementId } });
      expect(dbAnn?.isPinned).toBe(false);
    });

    it('allows a tutor to re-pin the unpinned announcement', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${testDeptSlug}/announcements/${testAnnouncementId}/pin`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.announcement.isPinned).toBe(true);
      expect(res.body.message).toMatch(/pinned successfully/i);

      // Verify in DB
      const dbAnn = await prisma.announcement.findUnique({ where: { id: testAnnouncementId } });
      expect(dbAnn?.isPinned).toBe(true);
    });

    it('allows an administrator to unpin the announcement', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${testDeptSlug}/announcements/${testAnnouncementId}/pin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.announcement.isPinned).toBe(false);

      // Verify in DB
      const dbAnn = await prisma.announcement.findUnique({ where: { id: testAnnouncementId } });
      expect(dbAnn?.isPinned).toBe(false);
    });
  });
});
