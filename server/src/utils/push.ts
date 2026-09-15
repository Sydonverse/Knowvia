import {
  notifyDepartmentMembers,
  notifyUser,
  NotificationPayload,
} from '../services/notification.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  actionUrl?: string;
  type: string;
  departmentId?: string;
}

/**
 * Compatibility wrapper delegating to standard notification service
 */
export const sendDepartmentPushNotification = async ({
  departmentId,
  title,
  body,
  actionUrl = '/',
  type,
  excludeUserId,
}: PushNotificationPayload & { excludeUserId?: string }): Promise<void> => {
  if (!departmentId) return;
  await notifyDepartmentMembers(
    departmentId,
    {
      type,
      title,
      body,
      actionUrl,
      departmentId,
    },
    excludeUserId
  );
};

/**
 * Compatibility wrapper delegating to standard notification service
 */
export const sendUserPushNotification = async ({
  userId,
  title,
  body,
  actionUrl = '/',
  type,
  departmentId,
}: PushNotificationPayload & { userId: string }): Promise<void> => {
  await notifyUser(userId, {
    type,
    title,
    body,
    actionUrl,
    departmentId: departmentId || null,
  });
};
