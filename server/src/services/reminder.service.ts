import cron from 'node-cron';
import prisma from '../config/prisma';
import { notifyDepartmentMembers } from './notification.service';

/**
 * Check for classes that are scheduled within the next 24 hours
 * and haven't had their reminder dispatched yet.
 */
export const processClassReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    // Look ahead 26 hours (approx 1 day window)
    const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const upcomingClasses = await prisma.classSchedule.findMany({
      where: {
        reminderSent: false,
        startTime: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        department: { select: { id: true, name: true, slug: true } },
      },
    });

    if (upcomingClasses.length === 0) return;

    for (const schedule of upcomingClasses) {
      const classDateStr = new Date(schedule.startTime).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      const title = `⏰ Upcoming Class Reminder: ${schedule.title}`;
      const body = `Your class is scheduled for ${classDateStr} (${schedule.location}). Please be prepared!`;

      await notifyDepartmentMembers(schedule.departmentId, {
        type: 'CLASS_REMINDER',
        title,
        body,
        actionUrl: `/schedule/${schedule.id}`,
        departmentId: schedule.departmentId,
      });

      // Mark reminder as sent
      await prisma.classSchedule.update({
        where: { id: schedule.id },
        data: { reminderSent: true },
      });

      console.log(`[Reminder Service] Dispatched 1-day class reminder for: "${schedule.title}" in ${schedule.department.name}`);
    }
  } catch (err) {
    console.error('[Reminder Service] Error processing class reminders:', err);
  }
};

/**
 * Initialize the cron job to run hourly (and once immediately on startup)
 */
export const initReminderScheduler = (): void => {
  console.log('⏰ Initializing automated class reminder scheduler (every 30 minutes)...');

  // Run on startup
  processClassReminders();

  // Run every 30 minutes: "*/30 * * * *"
  cron.schedule('*/30 * * * *', () => {
    processClassReminders();
  });
};
