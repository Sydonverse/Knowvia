import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateSecureToken, hashToken } from '../utils/token.utils';
import { sendOnboardingEmail, getOnboardingUrl } from '../services/email.service';

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

    const onboardingUrl = getOnboardingUrl(rawToken);

    // 5. Dispatch onboarding invitation email
    let emailSent = false;
    let emailErrorMsg: string | null = null;
    try {
      await sendOnboardingEmail({
        to: normalizedEmail,
        recipientName: `${newUser.firstName} ${newUser.lastName}`,
        role: assignedRole,
        departmentName: department.name,
        rawToken,
      });
      emailSent = true;
    } catch (emailError: any) {
      console.error('Email dispatch failed during user creation:', emailError.message || emailError);
      emailSent = false;
      emailErrorMsg = emailError.message || 'Email delivery failed';
    }

    res.status(201).json({
      message: emailSent
        ? 'User account created and onboarding invitation sent successfully.'
        : 'User account created, but the invitation email could not be delivered automatically. You can copy the onboarding link and share it directly.',
      emailSent,
      emailWarning: emailSent ? null : emailErrorMsg,
      onboardingUrl,
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

    const onboardingUrl = getOnboardingUrl(rawToken);

    // Send email
    let emailSent = false;
    let emailErrorMsg: string | null = null;
    try {
      await sendOnboardingEmail({
        to: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        departmentName,
        rawToken,
      });
      emailSent = true;
    } catch (emailError: any) {
      console.error('Email dispatch failed during resendInvitation:', emailError.message || emailError);
      emailSent = false;
      emailErrorMsg = emailError.message || 'Email delivery failed';
    }

    res.json({
      message: emailSent
        ? 'A new onboarding invitation has been sent successfully.'
        : 'A new onboarding invitation has been generated, but the email could not be delivered. You can copy the onboarding link and share it directly.',
      emailSent,
      emailWarning: emailSent ? null : emailErrorMsg,
      onboardingUrl,
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

// In-memory overview cache (15 seconds TTL)
let overviewCache: { data: any; timestamp: number } | null = null;
const OVERVIEW_CACHE_TTL_MS = 15 * 1000;

/**
 * GET /api/v1/admin/overview
 * Returns organization-wide aggregated metrics, department breakdowns,
 * upcoming cross-department sessions, attention items, and recent real activity.
 * Supports ?fresh=true to bypass server cache.
 */
export const getAdminOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isFresh = req.query.fresh === 'true';
    const nowMs = Date.now();

    if (!isFresh && overviewCache && nowMs - overviewCache.timestamp < OVERVIEW_CACHE_TTL_MS) {
      res.json(overviewCache.data);
      return;
    }

    const now = new Date();

    // Batch 1: Core User, Department, Onboarding & Submission Metrics (4 concurrent queries)
    const [userRoleCounts, departments, pendingOnboardingCount, pendingSubmissionsCount] = await Promise.all([
      // Group user counts by role (1 query instead of 3)
      prisma.user
        .groupBy({
          by: ['role'],
          where: { deletedAt: null, isActive: true },
          _count: { _all: true },
        })
        .catch((err) => {
          console.warn('User groupBy query fallback:', err);
          return [] as Array<{ role: string; _count: { _all: number } }>;
        }),

      // Department breakdown (also provides activeDepartments count)
      prisma.department
        .findMany({
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
        })
        .catch((err) => {
          console.warn('Departments findMany query fallback:', err);
          return [];
        }),

      // Pending onboarding invitations
      prisma.onboardingInvitation
        .count({
          where: {
            usedAt: null,
            expiresAt: { gte: now },
            user: { isActive: false, deletedAt: null },
          },
        })
        .catch((err) => {
          console.warn('Onboarding count fallback:', err);
          return 0;
        }),

      // Submissions needing review
      prisma.submission
        .count({
          where: {
            status: { in: ['SUBMITTED', 'IN_REVIEW'] },
          },
        })
        .catch((err) => {
          console.warn('Submissions count fallback:', err);
          return 0;
        }),
    ]);

    // Parse user metrics from groupBy
    let totalActiveUsers = 0;
    let activeInterns = 0;
    let activeTutors = 0;

    userRoleCounts.forEach((group) => {
      const count = group._count._all || 0;
      totalActiveUsers += count;
      if (group.role === 'INTERN') activeInterns += count;
      if (group.role === 'TUTOR') activeTutors += count;
    });

    const activeDepartments = departments.length;

    // Batch 2: Schedules, Materials, Assignments & Recent Activities (4-5 concurrent queries)
    const [
      upcomingSessionsCount,
      totalMaterialsCount,
      activeAssignmentsCount,
      upcomingSessions,
      recentUsers,
      recentSubmissions,
      recentMaterials,
      recentSchedules,
    ] = await Promise.all([
      prisma.classSchedule
        .count({
          where: { endTime: { gte: now } },
        })
        .catch(() => 0),

      prisma.material.count().catch(() => 0),

      prisma.assignment
        .count({
          where: { status: 'OPEN' },
        })
        .catch(() => 0),

      prisma.classSchedule
        .findMany({
          where: { endTime: { gte: now } },
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
        })
        .catch((err) => {
          console.warn('Upcoming sessions query fallback:', err);
          return [];
        }),

      prisma.user
        .findMany({
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
        })
        .catch((err) => {
          console.warn('Recent users query fallback:', err);
          return [];
        }),

      prisma.submission
        .findMany({
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
        })
        .catch((err) => {
          console.warn('Recent submissions query fallback:', err);
          return [];
        }),

      prisma.material
        .findMany({
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: {
            id: true,
            title: true,
            createdAt: true,
            uploader: { select: { firstName: true, lastName: true } },
            department: { select: { name: true, slug: true, colorHex: true } },
          },
        })
        .catch((err) => {
          console.warn('Recent materials query fallback:', err);
          return [];
        }),

      prisma.classSchedule
        .findMany({
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: {
            id: true,
            title: true,
            createdAt: true,
            scheduler: { select: { firstName: true, lastName: true } },
            department: { select: { name: true, slug: true, colorHex: true } },
          },
        })
        .catch((err) => {
          console.warn('Recent schedules query fallback:', err);
          return [];
        }),
    ]);

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

    const payload = {
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
    };

    overviewCache = { data: payload, timestamp: Date.now() };

    res.json(payload);
  } catch (error) {
    console.error('getAdminOverview error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin organization overview data.' });
  }
};

