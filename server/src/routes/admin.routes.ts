import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
import {
  createUser,
  listUsers,
  resendInvitation,
  deleteUser,
  getAdminOverview,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes strictly require authentication and ADMIN role
router.use(authenticate);
router.use(requireRoles(['ADMIN']));

router.get('/overview', getAdminOverview);
router.post('/users', createUser);
router.get('/users', listUsers);
router.post('/users/:id/resend-invitation', resendInvitation);
router.delete('/users/:id', deleteUser);

export default router;
