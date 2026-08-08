import express from 'express';
import { listVenues, getVenueByChapter, upsertVenue, deleteVenue } from '../controllers/venueController.js';

const router = express.Router();

router.get('/', listVenues);
router.get('/:chapter', getVenueByChapter);
router.put('/:chapter', upsertVenue);
router.delete('/:chapter', deleteVenue);

export default router;
