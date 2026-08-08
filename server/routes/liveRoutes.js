import express from 'express';
import { getLiveStream, updateLiveStream } from '../controllers/liveController.js';

const router = express.Router();

router.get('/', getLiveStream);
router.put('/', updateLiveStream);

export default router;
