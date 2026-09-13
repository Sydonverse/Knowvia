import { Router } from 'express';
import {
  register,
  login,
  getMe,
  verifyOnboarding,
  completeOnboarding,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public Authentication Endpoints
router.post('/register', register); // Disabled - returns 403
router.post('/login', login);

// Onboarding Endpoints
router.post('/onboarding/verify', verifyOnboarding);
router.post('/onboarding/complete', completeOnboarding);

// Password Reset Endpoints
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Authenticated Session
router.get('/me', authenticate, getMe);

export default router;
