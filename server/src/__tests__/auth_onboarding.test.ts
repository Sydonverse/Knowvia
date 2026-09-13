import request from 'supertest';
import { app, server } from '../index';
import prisma from '../config/prisma';
import { emailTransporter } from '../services/email.service';
import { hashToken } from '../utils/token.utils';

describe('Knowvia Admin-Controlled Account Creation & Onboarding Security', () => {
  let adminToken: string;
  let internToken: string;
  let sendMailMock: jest.SpyInstance;

  beforeAll(async () => {
    // Mock nodemailer emailTransporter.sendMail so tests run offline and fast
    sendMailMock = jest
      .spyOn(emailTransporter, 'sendMail')
      .mockImplementation(async () => ({ messageId: 'test-message-id-12345' } as any));

    // 1. Obtain Admin JWT Token
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@knowvia.internal', password: 'password123' });
    adminToken = adminLoginRes.body.token;

    // 2. Obtain Student/Intern JWT Token (Non-Admin)
    const internLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'david.cyber@knowvia.internal', password: 'password123' });
    internToken = internLoginRes.body.token;
  });

  afterAll(async () => {
    sendMailMock.mockRestore();
    // Clean up test records
    await prisma.onboardingInvitation.deleteMany({
      where: { user: { email: { contains: 'test-onboarding' } } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: { contains: 'test-onboarding' } } },
    });
    await prisma.departmentMember.deleteMany({
      where: { user: { email: { contains: 'test-onboarding' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-onboarding' } },
    });

    await prisma.$disconnect();
    server.close();
  });

  // ─── 1. AUTHORIZATION TESTS ─────────────────────────────────
  describe('Authorization Controls', () => {
    it('rejects public self-registration with 403 Forbidden', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'self-register@test.internal',
        password: 'password123',
        firstName: 'Self',
        lastName: 'Register',
        role: 'INTERN',
        departmentSlug: 'cybersecurity',
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Public registration is disabled/i);
    });

    it('rejects unauthenticated user creation with 401', async () => {
      const res = await request(app).post('/api/v1/admin/users').send({
        email: 'test-onboarding-unauth@knowvia.internal',
        firstName: 'No',
        lastName: 'Auth',
        role: 'INTERN',
        departmentSlug: 'cybersecurity',
      });

      expect(res.status).toBe(401);
    });

    it('rejects non-admin (intern) user creation with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${internToken}`)
        .send({
          email: 'test-onboarding-intern-blocked@knowvia.internal',
          firstName: 'Blocked',
          lastName: 'Intern',
          role: 'INTERN',
          departmentSlug: 'cybersecurity',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  // ─── 2. USER CREATION & TOKEN SECURITY ─────────────────────
  describe('Admin User Creation & Token Security', () => {
    const testEmail = 'test-onboarding-newuser@knowvia.internal';
    let rawOnboardingToken: string;

    it('allows authenticated admin to create an account awaiting onboarding', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: testEmail,
          firstName: 'Alice',
          lastName: 'Smith',
          role: 'INTERN',
          departmentSlug: 'cybersecurity',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.isActive).toBe(false);
      expect(res.body.user.role).toBe('INTERN');

      // Email sending was triggered
      expect(sendMailMock).toHaveBeenCalled();
      const mailCall = sendMailMock.mock.calls[sendMailMock.mock.calls.length - 1][0];
      expect(mailCall.to).toBe(testEmail);
      expect(mailCall.html).toContain('Complete Account Setup');

      // Extract raw token from the sent email URL
      const tokenMatch = mailCall.text.match(/token=([a-f0-9]+)/);
      expect(tokenMatch).not.toBeNull();
      rawOnboardingToken = tokenMatch[1];
      expect(rawOnboardingToken.length).toBe(64); // 32 bytes hex
    });

    it('verifies that no password and no raw token are stored in the database', async () => {
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { onboardingInvitations: true },
      });

      expect(dbUser).not.toBeNull();
      expect(dbUser?.isActive).toBe(false);
      expect(dbUser?.passwordHash).toBeNull(); // No default password!

      // Token in DB must be hashed, NOT the raw token
      expect(dbUser?.onboardingInvitations.length).toBeGreaterThan(0);
      const invitation = dbUser!.onboardingInvitations[0];
      expect(invitation.tokenHash).not.toBe(rawOnboardingToken);
      expect(invitation.tokenHash).toBe(hashToken(rawOnboardingToken));
      expect(invitation.usedAt).toBeNull();
    });

    it('rejects duplicate user creation with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: testEmail,
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'INTERN',
          departmentSlug: 'cybersecurity',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('prevents an unonboarded user from logging in before completing setup', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid credentials or inactive account/i);
    });

    // ─── 3. ONBOARDING VERIFICATION & COMPLETION ───────────────
    it('verifies valid onboarding token and returns safe account metadata', async () => {
      const res = await request(app).post('/api/v1/auth/onboarding/verify').send({
        token: rawOnboardingToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.user.firstName).toBe('Alice');
      expect(res.body.user.lastName).toBe('Smith');
      expect(res.body.user.role).toBe('INTERN');
      expect(res.body.user.department.name).toBe('Cybersecurity');
      // Must not expose internal hashes
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects invalid or tampered onboarding tokens', async () => {
      const res = await request(app).post('/api/v1/auth/onboarding/verify').send({
        token: '0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid onboarding invitation/i);
    });

    it('completes onboarding: establishes user password and activates account', async () => {
      const newPassword = 'SecureInternPassword2026!';
      const res = await request(app).post('/api/v1/auth/onboarding/complete').send({
        token: rawOnboardingToken,
        password: newPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Account successfully activated/i);

      // Verify DB state
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { onboardingInvitations: true },
      });
      expect(dbUser?.isActive).toBe(true);
      expect(dbUser?.passwordHash).not.toBeNull();
      expect(dbUser?.onboardingInvitations[0].usedAt).not.toBeNull();
    });

    it('blocks reuse of an already used onboarding token', async () => {
      const res = await request(app).post('/api/v1/auth/onboarding/complete').send({
        token: rawOnboardingToken,
        password: 'AnotherPassword123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already been used/i);
    });

    it('allows newly onboarded user to log in with email and new password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'SecureInternPassword2026!',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('INTERN');
      expect(res.body.user.departments.length).toBe(1);
      expect(res.body.user.departments[0].name).toBe('Cybersecurity');
    });
  });

  // ─── 4. RESEND INVITATION & EXPIRATION ──────────────────────
  describe('Resend Invitation & Token Expiration', () => {
    const resendEmail = 'test-onboarding-resend@knowvia.internal';
    let userId: string;

    it('admin can resend onboarding invitation to a pending user', async () => {
      // 1. Create pending user
      const createRes = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: resendEmail,
          firstName: 'Bob',
          lastName: 'Jones',
          role: 'TUTOR',
          departmentSlug: 'web-dev',
        });
      expect(createRes.status).toBe(201);
      userId = createRes.body.user.id;

      // 2. Resend invitation
      const resendRes = await request(app)
        .post(`/api/v1/admin/users/${userId}/resend-invitation`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resendRes.status).toBe(200);
      expect(resendRes.body.message).toMatch(/new onboarding invitation has been sent/i);

      // Verify in DB that two invitations exist and the first is invalidated
      const invites = await prisma.onboardingInvitation.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      expect(invites.length).toBe(2);
      expect(invites[0].usedAt).not.toBeNull(); // Old one invalidated
      expect(invites[1].usedAt).toBeNull(); // New one fresh
    });

    it('expired onboarding token is rejected', async () => {
      // Create an expired invitation directly in DB
      const expiredRawToken = '111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000';
      const expiredHash = hashToken(expiredRawToken);

      await prisma.onboardingInvitation.create({
        data: {
          userId,
          tokenHash: expiredHash,
          expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        },
      });

      const res = await request(app).post('/api/v1/auth/onboarding/verify').send({
        token: expiredRawToken,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });
  });

  // ─── 5. PASSWORD RESET FLOW ────────────────────────────────
  describe('Password Reset Security Flow', () => {
    it('generates reset token and dispatches reset email for existing active user', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'admin@knowvia.internal',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset instructions have been sent/i);

      // Verify token created in DB
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@knowvia.internal' },
        include: { passwordResetTokens: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      expect(adminUser?.passwordResetTokens.length).toBe(1);
      const resetRecord = adminUser!.passwordResetTokens[0];
      expect(resetRecord.usedAt).toBeNull();
    });

    it('returns 200 generic message even for non-existent email (enumeration safe)', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'nonexistent-account-999@random.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset instructions have been sent/i);
    });

    it('completes password reset and allows login with new password', async () => {
      // Find the user we onboarded earlier
      const targetUser = await prisma.user.findUnique({
        where: { email: 'test-onboarding-newuser@knowvia.internal' },
      });

      // Request reset
      await request(app).post('/api/v1/auth/forgot-password').send({
        email: targetUser!.email,
      });

      const lastMailCall = sendMailMock.mock.calls[sendMailMock.mock.calls.length - 1][0];
      const resetTokenMatch = lastMailCall.text.match(/token=([a-f0-9]+)/);
      expect(resetTokenMatch).not.toBeNull();
      const rawResetToken = resetTokenMatch[1];

      // Perform reset
      const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: rawResetToken,
        password: 'NewlyUpdatedPassword2026!',
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toMatch(/password has been successfully reset/i);

      // Verify login works with new password
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: targetUser!.email,
        password: 'NewlyUpdatedPassword2026!',
      });
      expect(loginRes.status).toBe(200);

      // Reusing reset token fails
      const reuseRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: rawResetToken,
        password: 'AnotherPasswordAttempt!',
      });
      expect(reuseRes.status).toBe(400);
    });
  });
});
