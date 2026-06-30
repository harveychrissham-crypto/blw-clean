import express from 'express';
import { listMembers, searchMembers, checkInMember } from '../controllers/memberController.js';

const router = express.Router();

router.get('/', listMembers);
router.get('/search', searchMembers);
router.post('/:membershipId/checkin', checkInMember);

export default router;
