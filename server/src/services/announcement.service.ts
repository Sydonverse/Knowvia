import prisma from '../config/prisma';
import { getIO } from '../socket';
import { notifyDepartmentMembers, notifyAllUsers } from './notification.service';

export interface AutoAnnouncementInput {
  authorId: string;
  departmentId?: string | null;
  sourceType: 'ASSIGNMENT' | 'CLASS_SCHEDULE' | 'MATERIAL';
  sourceId: string;
  title: string;
  content: string;
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  actionUrl: string;
}

/**
 * Creates an auto-announcement when a tutor or admin performs major educational actions
 * (creates assignment, schedules class, uploads learning material).
 * Emits real-time socket events and sends push notifications to all department students.
 */
export const createAutoAnnouncement = async (input: AutoAnnouncementInput) => {
  try {
    const announcement = await prisma.announcement.create({
      data: {
        authorId: input.authorId,
        departmentId: input.departmentId || null,
        title: input.title,
        content: input.content,
        priority: input.priority || 'NORMAL',
        sourceType: input.sourceType,
        sourceId: input.sourceId,
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

    const io = getIO();
    if (io) {
      if (input.departmentId) {
        const dept = await prisma.department.findUnique({
          where: { id: input.departmentId },
          select: { slug: true },
        });
        if (dept) {
          io.to(`dept:${dept.slug}`).emit('announcement:new', announcement);
        }
      } else {
        io.emit('announcement:new', announcement);
      }
    }

    // Send push & in-app notification
    const notificationPayload = {
      type: input.sourceType,
      title: input.title,
      body: input.content,
      actionUrl: input.actionUrl,
      departmentId: input.departmentId || null,
    };

    if (input.departmentId) {
      await notifyDepartmentMembers(input.departmentId, notificationPayload, input.authorId);
    } else {
      await notifyAllUsers(notificationPayload, input.authorId);
    }

    return announcement;
  } catch (err) {
    console.error('Failed to create auto announcement:', err);
    return null;
  }
};
