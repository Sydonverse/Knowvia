import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
import { departmentAccessGuard } from '../middleware/departmentGuard';
import { upload } from '../middleware/upload';

import {
  listDepartments,
  getDepartment,
  createDepartment,
  joinDepartment,
} from '../controllers/department.controller';

import {
  listMaterials,
  uploadMaterial,
  downloadMaterial,
  deleteMaterial,
} from '../controllers/material.controller';

import {
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  clearDepartmentAnnouncements,
  toggleAnnouncementPin,
} from '../controllers/announcement.controller';

import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/schedule.controller';

import {
  listAssignments,
  createAssignment,
  updateAssignment,
  submitAssignment,
  reviewSubmission,
  deleteAssignment,
} from '../controllers/assignment.controller';

import { listMessages, sendMessage } from '../controllers/message.controller';

const router = Router();

// Base department routes
// Public listing of departments for registration dropdown
router.get('/', listDepartments);
router.post('/', authenticate, requireRoles(['ADMIN']), createDepartment);
router.post('/:slug/join', authenticate, joinDepartment);

// Department-scoped routes (strictly protected by departmentAccessGuard)
router.get('/:slug', authenticate, departmentAccessGuard, getDepartment);

// Learning Materials (File Sharing)
router.get('/:slug/materials', authenticate, departmentAccessGuard, listMaterials);
router.post('/:slug/materials', authenticate, departmentAccessGuard, upload.single('file'), uploadMaterial);
router.get('/:slug/materials/download/:filename', authenticate, downloadMaterial);
router.delete('/:slug/materials/:id', authenticate, departmentAccessGuard, deleteMaterial);

// Announcements
router.get('/:slug/announcements', authenticate, departmentAccessGuard, listAnnouncements);
router.post('/:slug/announcements', authenticate, departmentAccessGuard, createAnnouncement);
router.patch('/:slug/announcements/:id/pin', authenticate, departmentAccessGuard, toggleAnnouncementPin);
router.delete('/:slug/announcements', authenticate, departmentAccessGuard, clearDepartmentAnnouncements);
router.delete('/:slug/announcements/:id', authenticate, departmentAccessGuard, deleteAnnouncement);

// Class Schedules
router.get('/:slug/schedules', authenticate, departmentAccessGuard, listSchedules);
router.post('/:slug/schedules', authenticate, departmentAccessGuard, createSchedule);
router.put('/:slug/schedules/:id', authenticate, departmentAccessGuard, updateSchedule);
router.delete('/:slug/schedules/:id', authenticate, departmentAccessGuard, deleteSchedule);

// Assignment Management
router.get('/:slug/assignments', authenticate, departmentAccessGuard, listAssignments);
router.post('/:slug/assignments', authenticate, departmentAccessGuard, createAssignment);
router.post(
  '/:slug/assignments/:assignmentId/submit',
  authenticate,
  departmentAccessGuard,
  upload.single('file'),
  submitAssignment
);
router.post(
  '/:slug/assignments/:assignmentId/submissions/:submissionId/review',
  authenticate,
  departmentAccessGuard,
  reviewSubmission
);
router.put('/:slug/assignments/:assignmentId', authenticate, departmentAccessGuard, updateAssignment);
router.delete('/:slug/assignments/:assignmentId', authenticate, departmentAccessGuard, deleteAssignment);

// Chat Messages
router.get('/:slug/messages', authenticate, departmentAccessGuard, listMessages);
router.post('/:slug/messages', authenticate, departmentAccessGuard, sendMessage);

export default router;
