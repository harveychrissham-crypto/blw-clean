import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { registerToken, unregisterToken } from '../controllers/pushController.js';

const router = express.Router();

router.post('/register', authenticateToken, registerToken);
router.post('/unregister', authenticateToken, unregisterToken);

export default router;
