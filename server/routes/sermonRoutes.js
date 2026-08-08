import express from 'express';
import { listSermons, createSermon, updateSermon, deleteSermon, setFeaturedSermon } from '../controllers/sermonController.js';

const router = express.Router();

router.get('/', listSermons);
router.post('/', createSermon);
router.put('/:id', updateSermon);
router.put('/:id/feature', setFeaturedSermon);
router.delete('/:id', deleteSermon);

export default router;
