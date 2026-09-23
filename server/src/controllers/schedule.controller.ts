import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { createAutoAnnouncement } from '../services/announcement.service';
import { getIO } from '../socket';

export const listSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    const schedules = await prisma.classSchedule.findMany({
      where: { departmentId: dept.id },
      include: {
        scheduler: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ schedules });
  } catch (error) {
    console.error('List schedules error:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules' });
  }
};

export const createSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { title, description, startTime, endTime, location, meetingLink } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Role check: Only tutors and admin can schedule classes
    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can schedule classes' });
      return;
    }

    if (!title || !startTime || !endTime) {
      res.status(400).json({ error: 'Title, start time, and end time are required' });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });

    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        departmentId: dept.id,
        scheduledById: user.id,
        title: title.trim(),
        description: description ? description.trim() : '',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location ? location.trim() : 'Online / Hub Room',
        meetingLink: meetingLink ? meetingLink.trim() : null,
      },
      include: {
        scheduler: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Real-time broadcast to department room
    const io = getIO();
    if (io) {
      io.to(`dept:${dept.slug}`).emit('schedule:new', schedule);
    }

    // Auto-create Announcement & dispatch push notification
    const formattedDate = new Date(schedule.startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    await createAutoAnnouncement({
      authorId: user.id,
      departmentId: dept.id,
      sourceType: 'CLASS_SCHEDULE',
      sourceId: schedule.id,
      title: `📅 Class Scheduled: ${schedule.title}`,
      content: `Session set for ${formattedDate} (${schedule.location}). Please mark your calendar.`,
      priority: 'IMPORTANT',
      actionUrl: `/schedule/${schedule.id}`,
    });

    res.status(201).json({ schedule });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create class schedule' });
  }
};

export const updateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, location, meetingLink } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can edit class schedules' });
      return;
    }

    const existing = await prisma.classSchedule.findUnique({
      where: { id },
      include: { department: { select: { slug: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    // Non-admin tutors can only edit their own scheduled classes
    if (user.role !== 'ADMIN' && existing.scheduledById !== user.id) {
      res.status(403).json({ error: 'Forbidden: You can only edit your own scheduled classes' });
      return;
    }

    const updated = await prisma.classSchedule.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(startTime ? { startTime: new Date(startTime) } : {}),
        ...(endTime ? { endTime: new Date(endTime) } : {}),
        ...(location !== undefined ? { location: location.trim() } : {}),
        ...(meetingLink !== undefined ? { meetingLink: meetingLink ? meetingLink.trim() : null } : {}),
      },
      include: {
        scheduler: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    const io = getIO();
    if (io) {
      io.to(`dept:${existing.department.slug}`).emit('schedule:updated', updated);
    }

    res.json({ schedule: updated });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
};

export const deleteSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can delete class schedules' });
      return;
    }

    const schedule = await prisma.classSchedule.findUnique({
      where: { id },
      include: { department: { select: { slug: true } } },
    });

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    if (user.role !== 'ADMIN' && schedule.scheduledById !== user.id) {
      res.status(403).json({ error: 'Forbidden: You can only delete classes you scheduled' });
      return;
    }

    await prisma.classSchedule.delete({ where: { id } });

    const io = getIO();
    if (io) {
      io.to(`dept:${schedule.department.slug}`).emit('schedule:deleted', { id });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};
