import express from 'express';
import { listVenues, getVenueByChapter, upsertVenue, deleteVenue } from '../controllers/venueController.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';

const router = express.Router();

router.get('/', listVenues);
router.get('/:chapter', getVenueByChapter);
router.put('/:chapter', requireLeaderAdmin, upsertVenue);
router.delete('/:chapter', requireLeaderAdmin, deleteVenue);

export default router;
