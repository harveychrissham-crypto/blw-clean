import express from 'express';
import { listMembers, searchMembers, checkInMember } from '../controllers/memberController.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';

const router = express.Router();

router.get('/', requireLeaderAdmin, listMembers);
router.get('/search', requireLeaderAdmin, searchMembers);
router.post('/:membershipId/checkin', requireLeaderAdmin, checkInMember);

export default router;
