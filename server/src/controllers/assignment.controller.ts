import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { validateFileSafety } from '../utils/fileValidator';
import { createAutoAnnouncement } from '../services/announcement.service';
import { notifyUser } from '../services/notification.service';
import { getIO } from '../socket';

export const listAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    // Retrieve assignments with submission count and user's specific submission status
    const assignments = await prisma.assignment.findMany({
      where: { departmentId: dept.id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        submissions: {
          where: user.role === 'INTERN' ? { submittedById: user.id } : undefined,
          include: {
            submitter: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
            reviews: {
              include: {
                reviewer: {
                  select: { id: true, firstName: true, lastName: true, role: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute progress tracker metrics for students
    let progressStats = null;
    if (user.role === 'INTERN') {
      const total = assignments.length;
      let submittedCount = 0;
      let approvedCount = 0;
      let needsRevisionCount = 0;
      let pendingReviewCount = 0;

      assignments.forEach((a) => {
        const mySub = a.submissions.find((s) => s.submittedById === user.id);
        if (mySub) {
          submittedCount++;
          if (mySub.status === 'APPROVED') approvedCount++;
          else if (mySub.status === 'NEEDS_REVISION') needsRevisionCount++;
          else pendingReviewCount++;
        }
      });

      const percentage = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

      // Find primary active assignment (next due or last submitted that needs revision)
      const primaryAssignment =
        assignments.find((a) => {
          const mySub = a.submissions.find((s) => s.submittedById === user.id);
          return !mySub || mySub.status === 'NEEDS_REVISION';
        }) || assignments[0] || null;

      // Recent submission status updates
      const recentReviews: Array<{
        assignmentTitle: string;
        verdict: string;
        comment: string;
        date: string;
      }> = [];

      assignments.forEach((a) => {
        const mySub = a.submissions.find((s) => s.submittedById === user.id);
        if (mySub && mySub.reviews.length > 0) {
          mySub.reviews.forEach((r) => {
            recentReviews.push({
              assignmentTitle: a.title,
              verdict: r.verdict,
              comment: r.comment,
              date: r.createdAt.toISOString(),
            });
          });
        }
      });

      progressStats = {
        totalAssignments: total,
        submittedCount,
        approvedCount,
        needsRevisionCount,
        pendingReviewCount,
        completionPercentage: percentage,
        primaryAssignment: primaryAssignment
          ? {
              id: primaryAssignment.id,
              title: primaryAssignment.title,
              dueDate: primaryAssignment.dueDate,
              status: primaryAssignment.submissions[0]?.status || 'NOT_SUBMITTED',
            }
          : null,
        recentReviews: recentReviews.slice(0, 5),
      };
    }

    res.json({ assignments, progressStats });
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({ error: 'Failed to retrieve assignments' });
  }
};

export const createAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { title, description, dueDate, maxFileSize } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can create assignments' });
      return;
    }

    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required' });
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

    const assignment = await prisma.assignment.create({
      data: {
        departmentId: dept.id,
        createdById: user.id,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        maxFileSize: maxFileSize ? parseInt(maxFileSize, 10) : 25 * 1024 * 1024,
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        submissions: true,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`dept:${dept.slug}`).emit('assignment:new', assignment);
    }

    // Auto-create Announcement & dispatch push notification
    const dueStr = assignment.dueDate
      ? `Due: ${new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'No due date';

    await createAutoAnnouncement({
      authorId: user.id,
      departmentId: dept.id,
      sourceType: 'ASSIGNMENT',
      sourceId: assignment.id,
      title: `📝 New Assignment: ${assignment.title}`,
      content: `${assignment.description.slice(0, 180)} (${dueStr}). Check Assignment Management to submit your work.`,
      priority: 'IMPORTANT',
      actionUrl: '/assignments',
    });

    res.status(201).json({ assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
};

export const submitAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const { notes } = req.body;
    const user = req.user;
    const file = req.file;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { department: { select: { id: true, slug: true } } },
    });

    if (!assignment) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSizeBytes: number | null = null;

    if (file) {
      // Validate file safety
      const safetyCheck = validateFileSafety(null, file.path, file.originalname, file.size);
      if (!safetyCheck.isValid) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(400).json({ error: safetyCheck.error });
        return;
      }
      fileUrl = `/uploads/${file.filename}`;
      fileName = safetyCheck.sanitizedFilename;
      fileSizeBytes = file.size;
    }

    // Upsert submission (one submission per student per assignment)
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_submittedById: {
          assignmentId: assignment.id,
          submittedById: user.id,
        },
      },
      update: {
        notes: notes ? notes.trim() : '',
        ...(fileUrl ? { fileUrl, fileName, fileSizeBytes } : {}),
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        assignmentId: assignment.id,
        submittedById: user.id,
        notes: notes ? notes.trim() : '',
        fileUrl,
        fileName,
        fileSizeBytes,
        status: 'SUBMITTED',
      },
      include: {
        submitter: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        reviews: true,
      },
    });

    // Notify assignment creator (tutor)
    await notifyUser(assignment.createdById, {
      type: 'ASSIGNMENT_CREATED',
      title: `📬 New Submission: ${assignment.title}`,
      body: `${user.firstName} ${user.lastName} submitted their assignment. Ready for review.`,
      actionUrl: '/assignments',
      departmentId: assignment.departmentId,
    });

    const io = getIO();
    if (io) {
      io.to(`dept:${assignment.department.slug}`).emit('submission:new', {
        assignmentId: assignment.id,
        submission,
      });
    }

    res.status(201).json({ submission });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
};

export const reviewSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId, submissionId } = req.params;
    const { comment, verdict } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can review submissions' });
      return;
    }

    if (!comment || !verdict) {
      res.status(400).json({ error: 'Comment and verdict (APPROVED, NEEDS_REVISION, REJECTED) are required' });
      return;
    }

    const validVerdicts = ['APPROVED', 'NEEDS_REVISION', 'REJECTED'];
    if (!validVerdicts.includes(verdict)) {
      res.status(400).json({ error: 'Invalid verdict. Must be APPROVED, NEEDS_REVISION, or REJECTED' });
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { select: { title: true, departmentId: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // Create review
    const review = await prisma.submissionReview.create({
      data: {
        submissionId: submission.id,
        reviewerId: user.id,
        comment: comment.trim(),
        verdict,
      },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Update submission status based on verdict
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: { status: verdict },
      include: {
        reviews: {
          include: {
            reviewer: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Send direct notification to the intern who submitted
    const verdictEmojis: Record<string, string> = {
      APPROVED: '✅ Approved',
      NEEDS_REVISION: '🔄 Needs Revision',
      REJECTED: '❌ Rejected',
    };

    await notifyUser(submission.submittedById, {
      type: 'SUBMISSION_REVIEWED',
      title: `Assignment Feedback: ${submission.assignment.title}`,
      body: `${verdictEmojis[verdict] || verdict}: "${comment}" — reviewed by ${user.firstName} ${user.lastName}`,
      actionUrl: '/assignments',
      departmentId: submission.assignment.departmentId,
    });

    res.json({ review, submission: updatedSubmission });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: 'Failed to review submission' });
  }
};

export const deleteAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'TUTOR' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only tutors and administrators can delete assignments' });
      return;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { department: { select: { slug: true } } },
    });

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (user.role !== 'ADMIN' && assignment.createdById !== user.id) {
      res.status(403).json({ error: 'Forbidden: You can only delete assignments you created' });
      return;
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });

    const io = getIO();
    if (io) {
      io.to(`dept:${assignment.department.slug}`).emit('assignment:deleted', { id: assignmentId });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
};
