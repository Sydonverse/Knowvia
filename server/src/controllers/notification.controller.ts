import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const listNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        department: { select: { id: true, name: true, slug: true, colorHex: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: user.id, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
};

export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { id, recipientId: user.id },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

export const getVapidPublicKey = async (_req: AuthRequest, res: Response): Promise<void> => {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjDCWJxoBURZqvDxHLtlKTvnGDzk8';
  res.json({ publicKey });
};

export const subscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Valid push subscription object required' });
      return;
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
    });

    res.status(201).json({ message: 'Push subscription registered', subscription });
  } catch (error) {
    console.error('Subscribe push error:', error);
    res.status(500).json({ error: 'Failed to register push subscription' });
  }
};

export const dissociatePushDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ error: 'Endpoint is required' });
      return;
    }

    // Safely dissociate this device from any user account without destroying push capability
    await prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { userId: null },
    });

    res.json({ message: 'Device dissociated successfully' });
  } catch (error) {
    console.error('Dissociate push error:', error);
    res.status(500).json({ error: 'Failed to dissociate device' });
  }
};

export const unsubscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ error: 'Endpoint is required' });
      return;
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.json({ message: 'Push subscription removed' });
  } catch (error) {
    console.error('Unsubscribe push error:', error);
    res.status(500).json({ error: 'Failed to unregister push subscription' });
  }
};

export const sendTestPushNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Allow in non-production environments for any authenticated user, or in production for ADMINs
    if (process.env.NODE_ENV === 'production' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Test push notifications are restricted to administrators in production' });
      return;
    }

    const { notifyUser } = await import('../services/notification.service');

    await notifyUser(user.id, {
      title: 'Knowvia Test Alert',
      body: 'Push notifications are working properly on this device!',
      actionUrl: '/',
      type: 'TEST',
    });

    res.json({ message: 'Test notification dispatched to your subscribed device(s)' });
  } catch (error) {
    console.error('Send test push error:', error);
    res.status(500).json({ error: 'Failed to send test push notification' });
  }
};
