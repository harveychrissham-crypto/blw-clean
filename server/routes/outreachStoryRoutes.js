import express from 'express';
import {
  listStories,
  createStory,
  updateStory,
  deleteStory,
} from '../controllers/outreachStoryController.js';

const router = express.Router();

router.get('/', listStories);
router.post('/', createStory);
router.put('/:id', updateStory);
router.delete('/:id', deleteStory);

export default router;
