import webpush from 'web-push';
import prisma from '../config/prisma';
import { getIO } from '../socket';

// Initialize Web Push VAPID keys if provided
const vapidPublicKey =
  process.env.VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjDCWJxoBURZqvDxHLtlKTvnGDzk8';
const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY || 'EEe0_WvU_9tZfK2g8xXf0pU8dG_Zk181_6s7W5zE_9w';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@knowvia.internal';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.warn('Web Push VAPID configuration error:', err);
}

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  actionUrl: string;
  departmentId?: string | null;
}

/**
 * Dispatch web push notification to a specific user's active push subscriptions
 */
export const dispatchWebPushToUser = async (userId: string, payload: NotificationPayload): Promise<void> => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      actionUrl: payload.actionUrl,
      type: payload.type,
      data: {
        url: payload.actionUrl,
        type: payload.type,
        departmentId: payload.departmentId || null,
      },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
      } catch (err: any) {
        // If subscription is 410 Gone or 404 Not Found, delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.error('Error dispatching web push to user:', err);
  }
};

/**
 * Create and dispatch a notification to a single user
 */
export const notifyUser = async (userId: string, payload: NotificationPayload): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId: userId,
        departmentId: payload.departmentId || null,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        actionUrl: payload.actionUrl,
      },
      include: {
        department: { select: { id: true, name: true, slug: true, colorHex: true } },
      },
    });

    // Real-time socket emission
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }

    // Web push
    await dispatchWebPushToUser(userId, payload);
  } catch (err) {
    console.error('Failed to notify user:', err);
  }
};

/**
 * Create and dispatch notifications to all approved members of a department
 */
export const notifyDepartmentMembers = async (
  departmentId: string,
  payload: NotificationPayload,
  excludeUserId?: string
): Promise<void> => {
  try {
    const members = await prisma.departmentMember.findMany({
      where: {
        departmentId,
        status: 'APPROVED',
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);
    if (userIds.length === 0) return;

    // Create notifications in batch
    await prisma.notification.createMany({
      data: userIds.map((uid) => ({
        recipientId: uid,
        departmentId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        actionUrl: payload.actionUrl,
      })),
    });

    // Socket broadcast to department room
    const io = getIO();
    if (io) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { slug: true },
      });
      if (dept) {
        io.to(`dept:${dept.slug}`).emit('notification:broadcast', {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Send push notifications in parallel
    await Promise.allSettled(userIds.map((uid) => dispatchWebPushToUser(uid, payload)));
  } catch (err) {
    console.error('Failed to notify department members:', err);
  }
};

/**
 * Create and dispatch a notification to ALL users across the platform (for global admin announcements)
 */
export const notifyAllUsers = async (
  payload: NotificationPayload,
  excludeUserId?: string
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return;

    await prisma.notification.createMany({
      data: userIds.map((uid) => ({
        recipientId: uid,
        departmentId: null,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        actionUrl: payload.actionUrl,
      })),
    });

    const io = getIO();
    if (io) {
      io.emit('notification:broadcast', {
        ...payload,
        createdAt: new Date().toISOString(),
      });
    }

    await Promise.allSettled(userIds.map((uid) => dispatchWebPushToUser(uid, payload)));
  } catch (err) {
    console.error('Failed to notify all users:', err);
  }
};
