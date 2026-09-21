import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index';
import prisma from '../config/prisma';

describe('Knowvia Assignment Editing API (Tutor & Admin)', () => {
  jest.setTimeout(30000);

  let adminToken: string;
  let tutorToken: string;
  let internToken: string;
  let testDeptSlug: string;
  let testDeptId: string;
  let testAssignmentId: string;
  let tutorId: string;

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

    // 2. Ensure Test Department exists
    const dept = await prisma.department.upsert({
      where: { slug: 'test-assign-dept' },
      update: { isActive: true },
      create: {
        name: 'Test Assignment Department',
        slug: 'test-assign-dept',
        description: 'Department for testing assignment edit',
        icon: 'book-open',
        colorHex: '#6366f1',
        isActive: true,
      },
    });
    testDeptSlug = dept.slug;
    testDeptId = dept.id;

    // 3. Ensure Tutor exists and is a member of the department
    const tutor = await prisma.user.upsert({
      where: { email: 'test-assign-tutor@knowvia.internal' },
      update: { isActive: true, deletedAt: null },
      create: {
        email: 'test-assign-tutor@knowvia.internal',
        passwordHash,
        firstName: 'Test',
        lastName: 'Tutor',
        role: 'TUTOR',
        isActive: true,
      },
    });
    tutorId = tutor.id;

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
      where: { email: 'test-assign-intern@knowvia.internal' },
      update: { isActive: true, deletedAt: null },
      create: {
        email: 'test-assign-intern@knowvia.internal',
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

    // 5. Create a test assignment created by the tutor
    const assignment = await prisma.assignment.create({
      data: {
        title: 'Initial Assignment Title',
        description: 'Initial instructions for the assignment',
        dueDate: new Date('2026-10-15T23:59:59.000Z'),
        departmentId: dept.id,
        createdById: tutor.id,
        status: 'PUBLISHED',
      },
    });
    testAssignmentId = assignment.id;

    // Login tokens
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@knowvia.internal', password: 'password123' });
    adminToken = adminRes.body.token;

    const tutorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test-assign-tutor@knowvia.internal', password: 'password123' });
    tutorToken = tutorRes.body.token;

    const internRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test-assign-intern@knowvia.internal', password: 'password123' });
    internToken = internRes.body.token;
  });

  afterAll(async () => {
    // Thoroughly clean up created test entities
    try {
      if (testAssignmentId) {
        await prisma.assignment.deleteMany({ where: { id: testAssignmentId } });
      }
      if (testDeptId) {
        await prisma.assignment.deleteMany({ where: { departmentId: testDeptId } });
        await prisma.departmentMember.deleteMany({ where: { departmentId: testDeptId } });
        await prisma.department.deleteMany({ where: { id: testDeptId } });
      }
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'test-assign-tutor@knowvia.internal',
              'test-assign-intern@knowvia.internal',
            ],
          },
        },
      });
    } catch (e) {
      console.warn('Assignment test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('Authorization & Security', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/assignments/${testAssignmentId}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(401);
    });

    it('rejects intern role from editing assignments with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/assignments/${testAssignmentId}`)
        .set('Authorization', `Bearer ${internToken}`)
        .send({ title: 'Intern Attempted Change' });

      expect(res.status).toBe(403);
    });

    it('returns 404 if assignment does not exist', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/assignments/non-existent-uuid-12345`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
    });
  });

  describe('Tutor & Admin Edit Functionality', () => {
    it('allows the creator tutor to edit title, description, and dueDate', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/assignments/${testAssignmentId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Updated Assignment Title by Tutor',
          description: 'Refined project deliverables and expectations',
          dueDate: '2026-11-01T18:00:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.assignment).toBeDefined();
      expect(res.body.assignment.title).toBe('Updated Assignment Title by Tutor');
      expect(res.body.assignment.description).toBe('Refined project deliverables and expectations');
      expect(new Date(res.body.assignment.dueDate).toISOString()).toBe('2026-11-01T18:00:00.000Z');

      // Verify DB persistence
      const inDb = await prisma.assignment.findUnique({ where: { id: testAssignmentId } });
      expect(inDb?.title).toBe('Updated Assignment Title by Tutor');
    });

    it('allows an administrator to edit assignment details', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/assignments/${testAssignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Assignment Title by Admin',
          description: 'Admin adjusted briefing',
        });

      expect(res.status).toBe(200);
      expect(res.body.assignment.title).toBe('Updated Assignment Title by Admin');

      // Verify DB persistence
      const inDb = await prisma.assignment.findUnique({ where: { id: testAssignmentId } });
      expect(inDb?.title).toBe('Updated Assignment Title by Admin');
    });
  });
});
