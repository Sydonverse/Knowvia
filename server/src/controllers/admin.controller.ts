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
    }, { maxWait: 10000, timeout: 20000 });

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
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
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

/**
 * DELETE /api/v1/admin/users/:id
 * Soft-deletes a user from Knowvia:
 * - Prevents self-removal by administrators
 * - Deactivates user (isActive = false, deletedAt = now)
 * - Invalidates all active sessions (rejected immediately by authenticate middleware)
 * - Invalidates pending onboarding invitations and password reset tokens
 * - Revokes department memberships
 * - Preserves historical curriculum materials and assignments to avoid cascade destruction
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Prevent admin self-deletion
    if (req.user && req.user.id === id) {
      res.status(400).json({ error: 'Admins cannot remove or deactivate their own account.' });
      return;
    }

    // 2. Locate target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (targetUser.deletedAt) {
      res.status(400).json({ error: 'This user account has already been removed.' });
      return;
    }

    // 3. Atomically deactivate user, cancel invitations, and revoke department access
    await prisma.$transaction(async (tx) => {
      // Deactivate user
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      // Invalidate any unused onboarding invitations
      await tx.onboardingInvitation.updateMany({
        where: { userId: targetUser.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Invalidate any unused password reset tokens
      await tx.passwordResetToken.updateMany({
        where: { userId: targetUser.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Remove department memberships to sever workspace access
      await tx.departmentMember.deleteMany({
        where: { userId: targetUser.id },
      });
    }, { maxWait: 10000, timeout: 20000 });

    res.json({
      message: `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) has been successfully removed.`,
    });
  } catch (error) {
    console.error('Admin deleteUser error:', error);
    res.status(500).json({ error: 'Failed to remove user account.' });
  }
};

/**
 * GET /api/v1/admin/overview
 * Returns organization-wide aggregated metrics, department breakdowns,
 * upcoming cross-department sessions, attention items, and recent real activity.
 */
export const getAdminOverview = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // 1. Organization Summary Counts
    const [
      totalActiveUsers,
      activeInterns,
      activeTutors,
      activeDepartments,
      pendingOnboardingCount,
      pendingSubmissionsCount,
      upcomingSessionsCount,
      totalMaterialsCount,
      activeAssignmentsCount,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true, role: 'INTERN' } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true, role: 'TUTOR' } }),
      prisma.department.count({ where: { isActive: true } }),
      prisma.onboardingInvitation.count({
        where: {
          usedAt: null,
          expiresAt: { gte: now },
          user: { isActive: false, deletedAt: null },
        },
      }),
      prisma.submission.count({
        where: {
          status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        },
      }),
      prisma.classSchedule.count({
        where: {
          endTime: { gte: now },
        },
      }),
      prisma.material.count(),
      prisma.assignment.count({
        where: {
          status: 'OPEN',
        },
      }),
    ]);

    // 2. Department Breakdown
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        colorHex: true,
        members: {
          where: { status: 'APPROVED', user: { deletedAt: null, isActive: true } },
          select: { role: true },
        },
        schedules: {
          where: { endTime: { gte: now } },
          select: { id: true },
        },
        assignments: {
          where: { status: 'OPEN' },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const departmentStats = departments.map((dept) => {
      const interns = dept.members.filter((m) => m.role === 'INTERN').length;
      const tutors = dept.members.filter((m) => m.role === 'TUTOR').length;
      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        icon: dept.icon,
        colorHex: dept.colorHex,
        internCount: interns,
        tutorCount: tutors,
        upcomingSessionsCount: dept.schedules.length,
        activeAssignmentsCount: dept.assignments.length,
        status: 'Active',
      };
    });

    // 3. Organization-wide Upcoming Sessions (next 6 upcoming)
    const upcomingSessions = await prisma.classSchedule.findMany({
      where: {
        endTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
      take: 6,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        meetingLink: true,
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
            colorHex: true,
            icon: true,
          },
        },
        scheduler: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // 4. Requires Attention items
    const attentionItems: Array<{
      id: string;
      type: 'ONBOARDING' | 'SUBMISSION' | 'SESSION';
      title: string;
      description: string;
      count: number;
      actionText: string;
      actionTab: string;
    }> = [];

    if (pendingOnboardingCount > 0) {
      attentionItems.push({
        id: 'attention-onboarding',
        type: 'ONBOARDING',
        title: `${pendingOnboardingCount} Pending Onboarding Invitation${pendingOnboardingCount > 1 ? 's' : ''}`,
        description: 'Users have received onboarding links and need to complete setup.',
        count: pendingOnboardingCount,
        actionText: 'Manage Users',
        actionTab: 'users',
      });
    }

    if (pendingSubmissionsCount > 0) {
      attentionItems.push({
        id: 'attention-submissions',
        type: 'SUBMISSION',
        title: `${pendingSubmissionsCount} Assignment Submission${pendingSubmissionsCount > 1 ? 's' : ''} Awaiting Review`,
        description: 'Student submissions across departments are pending evaluation.',
        count: pendingSubmissionsCount,
        actionText: 'View Submissions',
        actionTab: 'assignments',
      });
    }

    // 5. Recent Activity Feed (real events from DB timestamps)
    const [recentUsers, recentSubmissions, recentMaterials, recentSchedules] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          departmentMemberships: {
            take: 1,
            select: { department: { select: { name: true, slug: true, colorHex: true } } },
          },
        },
      }),
      prisma.submission.findMany({
        orderBy: { submittedAt: 'desc' },
        take: 4,
        select: {
          id: true,
          submittedAt: true,
          submitter: { select: { firstName: true, lastName: true } },
          assignment: {
            select: {
              title: true,
              department: { select: { name: true, slug: true, colorHex: true } },
            },
          },
        },
      }),
      prisma.material.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          title: true,
          createdAt: true,
          uploader: { select: { firstName: true, lastName: true } },
          department: { select: { name: true, slug: true, colorHex: true } },
        },
      }),
      prisma.classSchedule.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          title: true,
          createdAt: true,
          scheduler: { select: { firstName: true, lastName: true } },
          department: { select: { name: true, slug: true, colorHex: true } },
        },
      }),
    ]);

    const activityFeed: Array<{
      id: string;
      type: 'USER_JOINED' | 'SUBMISSION' | 'MATERIAL' | 'SCHEDULE';
      title: string;
      detail: string;
      departmentName: string;
      departmentSlug: string;
      departmentColor: string;
      timestamp: Date;
    }> = [];

    recentUsers.forEach((u) => {
      const dept = u.departmentMemberships[0]?.department;
      activityFeed.push({
        id: `act-user-${u.id}`,
        type: 'USER_JOINED',
        title: `${u.firstName} ${u.lastName}`.trim() || 'New User',
        detail: u.isActive ? `Joined as ${u.role}` : `Provisioned as ${u.role} (Pending Onboarding)`,
        departmentName: dept?.name || 'All Departments',
        departmentSlug: dept?.slug || '',
        departmentColor: dept?.colorHex || '#6366f1',
        timestamp: u.createdAt,
      });
    });

    recentSubmissions.forEach((s) => {
      activityFeed.push({
        id: `act-sub-${s.id}`,
        type: 'SUBMISSION',
        title: `${s.submitter.firstName} ${s.submitter.lastName}`.trim(),
        detail: `Submitted "${s.assignment.title}"`,
        departmentName: s.assignment.department.name,
        departmentSlug: s.assignment.department.slug,
        departmentColor: s.assignment.department.colorHex,
        timestamp: s.submittedAt,
      });
    });

    recentMaterials.forEach((m) => {
      activityFeed.push({
        id: `act-mat-${m.id}`,
        type: 'MATERIAL',
        title: `${m.uploader.firstName} ${m.uploader.lastName}`.trim(),
        detail: `Uploaded "${m.title}"`,
        departmentName: m.department.name,
        departmentSlug: m.department.slug,
        departmentColor: m.department.colorHex,
        timestamp: m.createdAt,
      });
    });

    recentSchedules.forEach((sc) => {
      activityFeed.push({
        id: `act-sched-${sc.id}`,
        type: 'SCHEDULE',
        title: `${sc.scheduler.firstName} ${sc.scheduler.lastName}`.trim(),
        detail: `Scheduled "${sc.title}"`,
        departmentName: sc.department.name,
        departmentSlug: sc.department.slug,
        departmentColor: sc.department.colorHex,
        timestamp: sc.createdAt,
      });
    });

    // Sort combined activities descending by timestamp and take top 6
    activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const topActivities = activityFeed.slice(0, 6);

    res.json({
      metrics: {
        totalUsers: totalActiveUsers,
        activeInterns,
        activeTutors,
        activeDepartments,
        pendingOnboardingCount,
        pendingSubmissionsCount,
        upcomingSessionsCount,
        totalMaterialsCount,
        activeAssignmentsCount,
      },
      departments: departmentStats,
      upcomingSessions,
      attentionItems,
      recentActivity: topActivities,
    });
  } catch (error) {
    console.error('getAdminOverview error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin organization overview data.' });
  }
};

