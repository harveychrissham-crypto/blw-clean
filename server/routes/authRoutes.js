import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { health, login, register, logout, me, deleteAccount } from '../controllers/authController.js';

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Brute-force protection: max 10 attempts per 15 minutes per IP on auth routes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,       // Return rate-limit info in RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failed/erroring requests
});

// Slightly looser limit for registration (legitimate users shouldn't retry much)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

router.get('/health', health);
router.post('/login', authLimiter, login);
router.post('/register', registerLimiter, register);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);
router.route('/account')
  .all(authenticateToken)
  .post(deleteAccount)
  .delete(deleteAccount);
router.post('/account/delete', authenticateToken, deleteAccount);

console.log('[server] authRoutes loaded with /health, /login, /register, /account (POST+DELETE)');

export default router;
