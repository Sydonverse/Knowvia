import {
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notification.controller';
import prisma from '../config/prisma';

jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('Knowvia Notification Tray Item Deletion & Clear All API', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: {
        id: 'user-xyz-123',
        email: 'student@knowvia.internal',
        role: 'INTERN',
      },
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('deleteNotification (Single Item Removal)', () => {
    it('returns 401 if user is unauthenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'notif-1' };

      await deleteNotification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized' })
      );
    });

    it('returns 404 if notification was not found for this user', async () => {
      mockReq.params = { id: 'notif-999' };
      (prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await deleteNotification(mockReq, mockRes);

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'notif-999', recipientId: 'user-xyz-123' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Notification not found' })
      );
    });

    it('deletes the specific notification and returns 200', async () => {
      mockReq.params = { id: 'notif-123' };
      (prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await deleteNotification(mockReq, mockRes);

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', recipientId: 'user-xyz-123' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/deleted successfully/i) })
      );
    });
  });

  describe('clearAllNotifications (Entire Tray Purge)', () => {
    it('returns 401 if user is unauthenticated', async () => {
      mockReq.user = undefined;

      await clearAllNotifications(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized' })
      );
    });

    it('clears all notifications for the authenticated user and returns 200', async () => {
      (prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await clearAllNotifications(mockReq, mockRes);

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-xyz-123' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/cleared successfully/i) })
      );
    });
  });
});
