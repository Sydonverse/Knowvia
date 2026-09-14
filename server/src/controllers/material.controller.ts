import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { validateFileSafety } from '../utils/fileValidator';
import { createAutoAnnouncement } from '../services/announcement.service';
import { getIO } from '../socket';

export const listMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const materials = await prisma.material.findMany({
      where: { departmentId: dept.id },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ materials });
  } catch (error) {
    console.error('List materials error:', error);
    res.status(500).json({ error: 'Failed to retrieve learning materials' });
  }
};

export const uploadMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { title, description } = req.body;
    const user = req.user;
    const file = req.file;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Only tutors and admin have file sharing / material upload privileges
    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can upload learning materials' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    if (!title) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ error: 'Material title is required' });
      return;
    }

    // File security inspection (magic bytes, dangerous extensions, size)
    const safetyCheck = validateFileSafety(null, file.path, file.originalname, file.size);
    if (!safetyCheck.isValid) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(400).json({ error: safetyCheck.error });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });

    if (!dept) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    const fileUrl = `/uploads/${file.filename}`;

    const material = await prisma.material.create({
      data: {
        departmentId: dept.id,
        uploadedById: user.id,
        title: title.trim(),
        description: description ? description.trim() : '',
        fileName: safetyCheck.sanitizedFilename,
        fileUrl,
        fileMimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Real-time broadcast to department
    const io = getIO();
    if (io) {
      io.to(`dept:${dept.slug}`).emit('material:new', material);
    }

    // Auto-create Announcement & dispatch push notification to students
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    await createAutoAnnouncement({
      authorId: user.id,
      departmentId: dept.id,
      sourceType: 'MATERIAL',
      sourceId: material.id,
      title: `📚 New Learning Material: ${material.title}`,
      content: `A new study material has been added: "${safetyCheck.sanitizedFilename}" (${sizeMb} MB). Available in your Learning Materials tab.`,
      priority: 'NORMAL',
      actionUrl: '/materials',
    });

    res.status(201).json({ material });
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({ error: 'Failed to upload learning material' });
  }
};

export const downloadMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on server' });
      return;
    }

    // Force attachment download to avoid in-browser script execution
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download material error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can delete materials' });
      return;
    }

    const material = await prisma.material.findUnique({
      where: { id },
      include: { department: { select: { slug: true } } },
    });

    if (!material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    if (user.role !== 'ADMIN' && material.uploadedById !== user.id) {
      res.status(403).json({ error: 'Forbidden: You can only delete materials you uploaded' });
      return;
    }

    // Try deleting file from disk
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    const filename = path.basename(material.fileUrl);
    const diskPath = path.join(uploadDir, filename);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    await prisma.material.delete({ where: { id } });

    const io = getIO();
    if (io) {
      io.to(`dept:${material.department.slug}`).emit('material:deleted', { id });
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};
