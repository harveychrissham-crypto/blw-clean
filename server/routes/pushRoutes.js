import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';
import {
  registerToken,
  unregisterToken,
  sendNotification,
  sendSelfTestNotification,
} from '../controllers/pushController.js';

const router = express.Router();

router.post('/register', authenticateToken, registerToken);
router.post('/unregister', authenticateToken, unregisterToken);
router.post('/test', authenticateToken, sendSelfTestNotification);
router.post('/send', requireLeaderAdmin, sendNotification);

export default router;
