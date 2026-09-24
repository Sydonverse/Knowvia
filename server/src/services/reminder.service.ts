import cron from 'node-cron';
import prisma from '../config/prisma';
import { notifyDepartmentMembers } from './notification.service';

/**
 * 1. Check for classes scheduled within the next 26 hours (~1 day)
 *    and dispatch advance preparation reminder if not yet sent.
 */
export const processAdvanceClassReminders = async (): Promise<void> => {
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

      // Mark 1-day reminder as sent
      await prisma.classSchedule.update({
        where: { id: schedule.id },
        data: { reminderSent: true },
      });

      console.log(`[Reminder Service] Dispatched 1-day class reminder for: "${schedule.title}" in ${schedule.department.name}`);
    }
  } catch (err) {
    console.error('[Reminder Service] Error processing advance class reminders:', err);
  }
};

/**
 * 2. Check for classes whose scheduled start time has arrived (starting now)
 *    and dispatch real-time "Starting Now" reminder if not yet sent.
 */
export const processStartingNowReminders = async (): Promise<void> => {
  try {
    const now = new Date();

    // Silently mark past classes that already ended so old historical records aren't spammed
    await prisma.classSchedule.updateMany({
      where: {
        startedReminderSent: false,
        endTime: {
          lt: now,
        },
      },
      data: {
        startedReminderSent: true,
      },
    });

    // Find sessions whose scheduled startTime has arrived and have not finished yet
    const activeClasses = await prisma.classSchedule.findMany({
      where: {
        startedReminderSent: false,
        startTime: {
          lte: now,
        },
        endTime: {
          gte: now,
        },
      },
      include: {
        department: { select: { id: true, name: true, slug: true } },
      },
    });

    if (activeClasses.length === 0) return;

    for (const schedule of activeClasses) {
      // Check if session started within a sensible threshold (e.g. within last 30 minutes)
      const minutesSinceStart = (now.getTime() - new Date(schedule.startTime).getTime()) / (1000 * 60);
      if (minutesSinceStart <= 30) {
        const title = `🔴 Class Starting Now: ${schedule.title}`;
        const body = schedule.meetingLink
          ? `Your session has begun at ${schedule.location}. Click to join virtual meeting!`
          : `Your session has begun at ${schedule.location}. Please join your class now!`;

        await notifyDepartmentMembers(schedule.departmentId, {
          type: 'CLASS_STARTING',
          title,
          body,
          actionUrl: `/schedule/${schedule.id}`,
          departmentId: schedule.departmentId,
        });

        console.log(`[Reminder Service] Dispatched STARTING NOW reminder for: "${schedule.title}" in ${schedule.department.name}`);
      }

      await prisma.classSchedule.update({
        where: { id: schedule.id },
        data: { startedReminderSent: true },
      });
    }
  } catch (err) {
    console.error('[Reminder Service] Error processing starting-now reminders:', err);
  }
};

/**
 * Unified reminder processor combining advance and live start checks
 */
export const processClassReminders = async (): Promise<void> => {
  await processAdvanceClassReminders();
  await processStartingNowReminders();
};

/**
 * Initialize the cron job to run every 1 minute for exact start-time accuracy
 * (and run once immediately on startup)
 */
export const initReminderScheduler = (): void => {
  console.log('⏰ Initializing automated class reminder scheduler (every 1 minute)...');

  // Run on startup
  processClassReminders();

  // Run every 1 minute: "* * * * *"
  cron.schedule('* * * * *', () => {
    processClassReminders();
  });
};
