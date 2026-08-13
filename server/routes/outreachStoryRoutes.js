import express from 'express';
import {
  listStories,
  createStory,
  updateStory,
  deleteStory,
} from '../controllers/outreachStoryController.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';

const router = express.Router();

router.get('/', listStories);
router.post('/', requireLeaderAdmin, createStory);
router.put('/:id', requireLeaderAdmin, updateStory);
router.delete('/:id', requireLeaderAdmin, deleteStory);

export default router;
