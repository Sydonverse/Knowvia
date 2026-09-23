import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { notifyDepartmentMembers, notifyAllUsers } from '../services/notification.service';
import { getIO } from '../socket';

export const listAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    // Find announcements this specific user has dismissed/deleted
    const dismissed = await prisma.dismissedAnnouncement.findMany({
      where: { userId: user.id },
      select: { announcementId: true },
    });
    const dismissedIds = dismissed.map((d) => d.announcementId);

    // Return department and global announcements that THIS user has NOT dismissed
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [{ departmentId: dept.id }, { departmentId: null }],
        id: { notIn: dismissedIds },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        department: {
          select: { id: true, name: true, slug: true, colorHex: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ announcements });
  } catch (error) {
    console.error('List announcements error:', error);
    res.status(500).json({ error: 'Failed to retrieve announcements' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { title, content, priority, isPinned, isGlobal } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Only tutors and admin can create announcements
    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can post announcements' });
      return;
    }

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    let targetDeptId: string | null = null;
    let targetDeptSlug: string | null = null;

    // If admin explicitly makes it global OR slug is 'global'
    if (user.role === 'ADMIN' && (isGlobal || slug === 'global')) {
      targetDeptId = null;
    } else {
      const dept = await prisma.department.findUnique({
        where: { slug },
        select: { id: true, slug: true, name: true },
      });
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }
      targetDeptId = dept.id;
      targetDeptSlug = dept.slug;
    }

    const announcement = await prisma.announcement.create({
      data: {
        departmentId: targetDeptId,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        priority: priority || 'NORMAL',
        isPinned: !!isPinned,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        department: {
          select: { id: true, name: true, slug: true, colorHex: true },
        },
      },
    });

    // Real-time broadcast
    const io = getIO();
    if (io) {
      if (targetDeptSlug) {
        io.to(`dept:${targetDeptSlug}`).emit('announcement:new', announcement);
      } else {
        io.emit('announcement:new', announcement);
      }
    }

    // Send push notification
    const notificationPayload = {
      type: 'ANNOUNCEMENT',
      title: `📢 Announcement: ${announcement.title}`,
      body: announcement.content,
      actionUrl: `/announcements/${announcement.id}`,
      departmentId: targetDeptId,
    };

    if (targetDeptId) {
      await notifyDepartmentMembers(targetDeptId, notificationPayload, user.id);
    } else {
      await notifyAllUsers(notificationPayload, user.id);
    }

    res.status(201).json({ announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!announcement) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    // Record personalized dismissal so this announcement is only removed for the current user
    await prisma.dismissedAnnouncement.upsert({
      where: {
        userId_announcementId: {
          userId: user.id,
          announcementId: id,
        },
      },
      create: {
        userId: user.id,
        announcementId: id,
      },
      update: {},
    });

    // Notify only this user's active client session(s)
    const io = getIO();
    if (io) {
      io.to(`user:${user.id}`).emit('announcement:deleted', { id });
    }

    res.json({ message: 'Announcement dismissed from your feed' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

export const clearDepartmentAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    // Find all announcements currently belonging to this department or global
    const visibleAnnouncements = await prisma.announcement.findMany({
      where: {
        OR: [{ departmentId: dept.id }, { departmentId: null }],
      },
      select: { id: true },
    });

    // Record personalized dismissal for every visible announcement for this user
    for (const ann of visibleAnnouncements) {
      await prisma.dismissedAnnouncement.upsert({
        where: {
          userId_announcementId: {
            userId: user.id,
            announcementId: ann.id,
          },
        },
        create: {
          userId: user.id,
          announcementId: ann.id,
        },
        update: {},
      });
    }

    // Notify only this user's active client session(s)
    const io = getIO();
    if (io) {
      io.to(`user:${user.id}`).emit('announcement:cleared', { departmentSlug: dept.slug });
    }

    res.json({ message: 'Announcements cleared from your feed' });
  } catch (error) {
    console.error('Clear announcements error:', error);
    res.status(500).json({ error: 'Failed to clear announcements' });
  }
};

export const toggleAnnouncementPin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can pin or unpin announcements' });
      return;
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        department: {
          select: { id: true, name: true, slug: true, colorHex: true },
        },
      },
    });

    if (!announcement) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    // If global announcement (departmentId is null), only ADMIN can toggle pin
    if (!announcement.departmentId && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only administrators can pin or unpin global announcements' });
      return;
    }

    // If department announcement and user is TUTOR, verify membership in that department
    if (announcement.departmentId && user.role === 'TUTOR') {
      const membership = await prisma.departmentMember.findUnique({
        where: {
          userId_departmentId: {
            userId: user.id,
            departmentId: announcement.departmentId,
          },
        },
      });

      if (!membership || membership.status !== 'APPROVED') {
        res.status(403).json({ error: 'Forbidden: You can only pin or unpin announcements within your assigned department' });
        return;
      }
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        isPinned: !announcement.isPinned,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        department: {
          select: { id: true, name: true, slug: true, colorHex: true },
        },
      },
    });

    // Real-time broadcast
    const io = getIO();
    if (io) {
      if (updated.department?.slug) {
        io.to(`dept:${updated.department.slug}`).emit('announcement:updated', updated);
      } else {
        io.emit('announcement:updated', updated);
      }
    }

    res.json({
      message: updated.isPinned ? 'Announcement pinned successfully' : 'Announcement unpinned successfully',
      announcement: updated,
    });
  } catch (error) {
    console.error('Toggle announcement pin error:', error);
    res.status(500).json({ error: 'Failed to update announcement pin status' });
  }
};

