import express from 'express';
import { listSermons, createSermon, updateSermon, deleteSermon, setFeaturedSermon } from '../controllers/sermonController.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';

const router = express.Router();

router.get('/', listSermons);
router.post('/', requireLeaderAdmin, createSermon);
router.put('/:id', requireLeaderAdmin, updateSermon);
router.put('/:id/feature', requireLeaderAdmin, setFeaturedSermon);
router.delete('/:id', requireLeaderAdmin, deleteSermon);

export default router;
