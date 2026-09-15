import { Request, Response } from 'express';
import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  dissociatePushDevice,
  sendTestPushNotification,
} from '../controllers/notification.controller';
import { dispatchWebPushToUser } from '../services/notification.service';
import prisma from '../config/prisma';
import webpush from 'web-push';

// Mock dependencies
jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    pushSubscription: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../socket', () => ({
  getIO: jest.fn(() => null),
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('Knowvia Web Push & PWA Notification System', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: {
        id: 'user-a-123',
        email: 'userA@knowvia.internal',
        role: 'INTERN',
      },
      body: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('1. VAPID Key Retrieval', () => {
    it('returns the configured VAPID public key', async () => {
      await getVapidPublicKey(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.any(String),
        })
      );
      const returnedKey = mockRes.json.mock.calls[0][0].publicKey;
      expect(returnedKey.length).toBeGreaterThan(20);
    });
  });

  describe('2. Push Subscription Registration & Reassociation', () => {
    it('fails with 400 when endpoint or keys are missing', async () => {
      mockReq.body = { endpoint: '' };
      await subscribePush(mockReq as any, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/valid push subscription/i) })
      );
    });

    it('successfully registers and links subscription to current user', async () => {
      mockReq.body = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/device-token-1',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };

      (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-a-123',
        endpoint: mockReq.body.endpoint,
      });

      await subscribePush(mockReq as any, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: mockReq.body.endpoint },
          update: expect.objectContaining({ userId: 'user-a-123' }),
          create: expect.objectContaining({ userId: 'user-a-123' }),
        })
      );
    });

    it('safely reassociates existing device subscription when User B logs in (preventing leaks)', async () => {
      // User B logs in on the same browser device
      mockReq.user = { id: 'user-b-456', email: 'userB@knowvia.internal', role: 'INTERN' };
      mockReq.body = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/shared-browser-device',
        keys: { p256dh: 'existing-key', auth: 'existing-auth' },
      };

      (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue({
        id: 'sub-shared',
        userId: 'user-b-456',
        endpoint: mockReq.body.endpoint,
      });

      await subscribePush(mockReq as any, mockRes as any);

      // Verify device is now reassociated with User B
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: mockReq.body.endpoint },
          update: expect.objectContaining({ userId: 'user-b-456' }),
        })
      );
    });
  });

  describe('3. Device Dissociation on Logout (Zero Leakage)', () => {
    it('dissociates device from user by setting userId to null without deleting subscription', async () => {
      mockReq.body = { endpoint: 'https://fcm.googleapis.com/fcm/send/device-token-1' };

      await dissociatePushDevice(mockReq as any, mockRes as any);

      expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: { endpoint: 'https://fcm.googleapis.com/fcm/send/device-token-1' },
        data: { userId: null },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/dissociated/i) })
      );
    });
  });

  describe('4. Explicit Unsubscribe (Disable Alerts)', () => {
    it('deletes subscription when user explicitly turns off notifications', async () => {
      mockReq.body = { endpoint: 'https://fcm.googleapis.com/fcm/send/device-token-1' };

      await unsubscribePush(mockReq as any, mockRes as any);

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'https://fcm.googleapis.com/fcm/send/device-token-1' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/removed/i) })
      );
    });
  });

  describe('5. Safe Test Push Notification Mechanism', () => {
    it('allows test notification in non-production environments for standard users', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-a-123',
          endpoint: 'https://fcm.googleapis.com/fcm/send/token',
          p256dh: 'p256',
          auth: 'auth',
        },
      ]);
      (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

      await sendTestPushNotification(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/dispatched/i) })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('rejects test notification in production if caller is not an ADMIN', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      mockReq.user.role = 'INTERN';

      await sendTestPushNotification(mockReq as any, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/restricted to administrators/i) })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('6. Expired / Invalid Subscription Cleanup (HTTP 410 / 404)', () => {
    it('automatically purges subscriptions from DB when push service returns 410 Gone', async () => {
      (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'sub-expired-410',
          userId: 'user-a-123',
          endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
          p256dh: 'p256',
          auth: 'auth',
        },
      ]);

      const goneError: any = new Error('Subscription expired');
      goneError.statusCode = 410;
      (webpush.sendNotification as jest.Mock).mockRejectedValue(goneError);

      await dispatchWebPushToUser('user-a-123', {
        type: 'ANNOUNCEMENT',
        title: 'Department Notice',
        body: 'Classes resume tomorrow at 9 AM.',
        actionUrl: '/announcements',
      });

      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { id: 'sub-expired-410' },
      });
    });
  });
});
