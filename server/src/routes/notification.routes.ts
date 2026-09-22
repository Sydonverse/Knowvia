import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  dissociatePushDevice,
  sendTestPushNotification,
} from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticate, listNotifications);
router.delete('/', authenticate, clearAllNotifications);
router.delete('/clear-all', authenticate, clearAllNotifications);
router.delete('/:id', authenticate, deleteNotification);
router.patch('/:id/read', authenticate, markRead);
router.post('/:id/read', authenticate, markRead);
router.patch('/read-all', authenticate, markAllRead);
router.post('/read-all', authenticate, markAllRead);

router.get('/vapid-key', authenticate, getVapidPublicKey);
router.post('/subscribe', authenticate, subscribePush);
router.post('/unsubscribe', authenticate, unsubscribePush);
router.post('/dissociate', authenticate, dissociatePushDevice);
router.post('/test-push', authenticate, sendTestPushNotification);

export default router;
