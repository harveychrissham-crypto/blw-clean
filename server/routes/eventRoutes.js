import express from 'express';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';

const router = express.Router();

router.get('/', listEvents);
router.post('/', requireLeaderAdmin, createEvent);
router.put('/:id', requireLeaderAdmin, updateEvent);
router.delete('/:id', requireLeaderAdmin, deleteEvent);

export default router;
