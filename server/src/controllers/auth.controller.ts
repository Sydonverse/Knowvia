import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateSecureToken, hashToken } from '../utils/token.utils';
import { sendPasswordResetEmail } from '../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'knowvia_jwt_secret_dev_key_2026_secure';

/**
 * POST /api/v1/auth/register
 * Public registration is disabled by design. Only administrators can provision accounts.
 */
export const register = async (_req: Request, res: Response): Promise<void> => {
  res.status(403).json({
    error: 'Public registration is disabled. All Knowvia accounts must be provisioned by an administrator.',
  });
};

/**
 * POST /api/v1/auth/login
 * Standard email + password login for active users.
 * Strictly blocks unonboarded (inactive or null password) accounts.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        departmentMemberships: {
          where: { status: 'APPROVED' },
          include: {
            department: {
              select: { id: true, name: true, slug: true, colorHex: true, icon: true, description: true },
            },
          },
        },
      },
    });

    // Block if user does not exist, is inactive, or has not set a password (pending onboarding)
    if (!user || !user.isActive || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    let userDepartments: any[] = [];
    if (user.role === 'ADMIN') {
      const allDepts = await prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, colorHex: true, icon: true, description: true },
        orderBy: { name: 'asc' },
      });
      userDepartments = allDepts.map((d) => ({
        ...d,
        memberRole: 'ADMIN',
      }));
    } else {
      userDepartments = user.departmentMemberships.map((m) => ({
        ...m.department,
        memberRole: m.role,
      }));
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        departments: userDepartments,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

/**
 * GET /api/v1/auth/me
 * Returns profile details for current authenticated session.
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        departmentMemberships: {
          where: { status: 'APPROVED' },
          include: {
            department: {
              select: { id: true, name: true, slug: true, colorHex: true, icon: true, description: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let userDepartments: any[] = [];
    if (user.role === 'ADMIN') {
      const allDepts = await prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, colorHex: true, icon: true, description: true },
        orderBy: { name: 'asc' },
      });
      userDepartments = allDepts.map((d) => ({
        ...d,
        memberRole: 'ADMIN',
      }));
    } else {
      userDepartments = user.departmentMemberships.map((m) => ({
        ...m.department,
        memberRole: m.role,
      }));
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        departments: userDepartments,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/auth/onboarding/verify
 * Public endpoint to verify the one-time onboarding token.
 * Returns safe account metadata (role, department, name, email) for display.
 */
export const verifyOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      res.status(400).json({ error: 'Onboarding token is required.' });
      return;
    }

    const tokenHash = hashToken(token.trim());

    const invitation = await prisma.onboardingInvitation.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            departmentMemberships: {
              include: { department: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      res.status(400).json({ error: 'Invalid onboarding invitation token.' });
      return;
    }

    if (invitation.usedAt) {
      res.status(400).json({
        error: 'This onboarding invitation has already been used. Please log in with your credentials.',
        alreadyUsed: true,
      });
      return;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      res.status(400).json({
        error: 'This onboarding invitation has expired. Please contact an administrator to request a new link.',
        expired: true,
      });
      return;
    }

    const user = invitation.user;
    const department = user.departmentMemberships[0]?.department || null;

    res.json({
      valid: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: department
          ? {
              id: department.id,
              name: department.name,
              slug: department.slug,
              colorHex: department.colorHex,
              icon: department.icon,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Verify onboarding error:', error);
    res.status(500).json({ error: 'Failed to verify onboarding invitation.' });
  }
};

/**
 * POST /api/v1/auth/onboarding/complete
 * Activates account and establishes the user's permanent password.
 * Invalidates token atomically to prevent race conditions or replay attacks.
 */
export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Onboarding token is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
      return;
    }

    const tokenHash = hashToken(token.trim());

    // Atomic transaction: verify freshness, update password hash, activate user, mark token used
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.onboardingInvitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation) {
        throw new Error('INVALID_TOKEN');
      }

      if (invitation.usedAt) {
        throw new Error('TOKEN_ALREADY_USED');
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        throw new Error('TOKEN_EXPIRED');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // 1. Activate user and set password
      await tx.user.update({
        where: { id: invitation.userId },
        data: {
          passwordHash,
          isActive: true,
        },
      });

      // 2. Invalidate token immediately
      await tx.onboardingInvitation.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
        },
      });
    });

    res.json({
      message: 'Account successfully activated! You can now log in using your email and new password.',
    });
  } catch (error: any) {
    if (error.message === 'INVALID_TOKEN') {
      res.status(400).json({ error: 'Invalid onboarding invitation token.' });
      return;
    }
    if (error.message === 'TOKEN_ALREADY_USED') {
      res.status(400).json({ error: 'This invitation has already been used.' });
      return;
    }
    if (error.message === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'This invitation has expired. Please contact an administrator.' });
      return;
    }

    console.error('Complete onboarding error:', error);
    res.status(500).json({ error: 'Internal server error while completing onboarding.' });
  }
};

/**
 * POST /api/v1/auth/forgot-password
 * Public endpoint to request a password reset email.
 * Safe against user enumeration: returns 200 generic message regardless.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Only dispatch if user exists, is active, and has completed initial onboarding
    if (user && user.isActive && user.passwordHash) {
      // Invalidate previous unused reset tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Send email (non-blocking for response)
      sendPasswordResetEmail({
        to: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        rawToken,
      }).catch((err) => {
        console.error('Failed to send password reset email:', err.message);
      });
    }

    // Always respond with identical success message to prevent user enumeration
    res.json({
      message: 'If an account exists with this email address, password reset instructions have been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

/**
 * POST /api/v1/auth/reset-password
 * Validates reset token and sets new password.
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Reset token is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
      return;
    }

    const tokenHash = hashToken(token.trim());

    await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!resetToken) {
        throw new Error('INVALID_TOKEN');
      }

      if (resetToken.usedAt) {
        throw new Error('TOKEN_ALREADY_USED');
      }

      if (new Date(resetToken.expiresAt) < new Date()) {
        throw new Error('TOKEN_EXPIRED');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
    });

    res.json({
      message: 'Your password has been successfully reset. You can now log in.',
    });
  } catch (error: any) {
    if (error.message === 'INVALID_TOKEN') {
      res.status(400).json({ error: 'Invalid password reset token.' });
      return;
    }
    if (error.message === 'TOKEN_ALREADY_USED') {
      res.status(400).json({ error: 'This password reset link has already been used.' });
      return;
    }
    if (error.message === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
      return;
    }

    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};
