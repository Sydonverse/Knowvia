import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateSecureToken, hashToken } from '../utils/token.utils';
import { sendOnboardingEmail } from '../services/email.service';

/**
 * POST /api/v1/admin/users
 * Admin creates a new user account without a password.
 * Generates a one-time onboarding token, stores its hash, and sends an onboarding email.
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, role, departmentSlug } = req.body;

    if (!email || !firstName || !lastName || !departmentSlug) {
      res.status(400).json({
        error: 'First name, last name, email address, and department are required.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const assignedRole = role === 'TUTOR' ? 'TUTOR' : 'INTERN';

    // 1. Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // 2. Validate department
    const department = await prisma.department.findUnique({
      where: { slug: departmentSlug.toLowerCase().trim() },
    });

    if (!department || !department.isActive) {
      res.status(404).json({ error: 'Selected department does not exist or is inactive.' });
      return;
    }

    // 3. Generate secure random token and hash
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 4. Create user record, department membership, and onboarding invitation
    const { newUser, invitation } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: assignedRole,
          isActive: false, // Inactive until onboarding is completed
          passwordHash: null, // No default password
        },
      });

      await tx.departmentMember.create({
        data: {
          userId: user.id,
          departmentId: department.id,
          role: assignedRole,
          status: 'APPROVED',
        },
      });

      const inv = await tx.onboardingInvitation.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return { newUser: user, invitation: inv };
    });

    // 5. Dispatch onboarding invitation email via Nodemailer
    try {
      await sendOnboardingEmail({
        to: normalizedEmail,
        recipientName: `${newUser.firstName} ${newUser.lastName}`,
        role: assignedRole,
        departmentName: department.name,
        rawToken,
      });
    } catch (emailError: any) {
      // Rollback newly created user and invitation so the admin can retry without 409 conflict
      console.error('Rolling back user creation due to email failure:', emailError.message);
      await prisma.user.delete({ where: { id: newUser.id } }).catch(() => {});

      res.status(502).json({
        error:
          'Failed to dispatch onboarding invitation email. The pending user was not created. Please verify your SMTP configuration.',
        details: emailError.message,
      });
      return;
    }

    res.status(201).json({
      message: 'User account created and onboarding invitation sent successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        department: {
          id: department.id,
          name: department.name,
          slug: department.slug,
        },
      },
      invitationExpiresAt: invitation.expiresAt,
    });
  } catch (error: any) {
    console.error('Admin createUser error:', error);
    res.status(500).json({ error: 'Internal server error during user creation.' });
  }
};

/**
 * GET /api/v1/admin/users
 * Returns list of users with their roles, department memberships, and onboarding status.
 */
export const listUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        avatarUrl: true,
        departmentMemberships: {
          where: { status: 'APPROVED' },
          include: {
            department: {
              select: { id: true, name: true, slug: true, colorHex: true },
            },
          },
        },
        onboardingInvitations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            expiresAt: true,
            usedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => {
      const latestInvite = u.onboardingInvitations[0] || null;
      const isPendingOnboarding = !u.isActive && latestInvite && !latestInvite.usedAt;
      const isExpired = latestInvite && new Date(latestInvite.expiresAt) < new Date() && !latestInvite.usedAt;

      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        avatarUrl: u.avatarUrl,
        departments: u.departmentMemberships.map((m) => m.department),
        onboardingStatus: u.isActive
          ? 'ACTIVE'
          : isExpired
          ? 'EXPIRED'
          : isPendingOnboarding
          ? 'PENDING'
          : 'INACTIVE',
        latestInvitation: latestInvite,
      };
    });

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Admin listUsers error:', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
};

/**
 * POST /api/v1/admin/users/:id/resend-invitation
 * Invalidates old invitation, generates a fresh token, and resends the onboarding email.
 */
export const resendInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        departmentMemberships: {
          include: { department: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.isActive && user.passwordHash) {
      res.status(400).json({ error: 'User has already completed onboarding and activated their account.' });
      return;
    }

    const dept = user.departmentMemberships[0]?.department;
    const departmentName = dept ? dept.name : 'General Workspace';

    // Invalidate previous unused invitations
    await prisma.onboardingInvitation.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate new token and 24-hour expiration
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newInvitation = await prisma.onboardingInvitation.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send email
    try {
      await sendOnboardingEmail({
        to: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        departmentName,
        rawToken,
      });
    } catch (emailError: any) {
      // Remove the newly created invitation on failure
      await prisma.onboardingInvitation.delete({ where: { id: newInvitation.id } }).catch(() => {});
      res.status(502).json({
        error: 'Failed to send onboarding email. Please check SMTP settings.',
        details: emailError.message,
      });
      return;
    }

    res.json({
      message: 'A new onboarding invitation has been sent successfully.',
      invitationExpiresAt: newInvitation.expiresAt,
    });
  } catch (error) {
    console.error('Admin resendInvitation error:', error);
    res.status(500).json({ error: 'Failed to resend onboarding invitation.' });
  }
};
