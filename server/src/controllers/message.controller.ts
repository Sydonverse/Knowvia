import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socket';

export const listMessages = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const messages = await prisma.message.findMany({
      where: { departmentId: dept.id },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Reasonable history buffer
    });

    res.json({ messages });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { content, replyToId } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Message content cannot be empty' });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        departmentId: dept.id,
        senderId: user.id,
        content: content.trim(),
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Real-time broadcast to department room
    const io = getIO();
    if (io) {
      io.to(`dept:${dept.slug}`).emit('message:new', message);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
};
