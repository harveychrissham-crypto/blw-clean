import express from 'express';
import {
  getLiveStream,
  updateLiveStream,
  recordLiveViewer,
  listLiveViewers,
} from '../controllers/liveController.js';

const router = express.Router();

router.get('/', getLiveStream);
router.put('/', updateLiveStream);
router.get('/viewers', listLiveViewers);
router.post('/viewers', recordLiveViewer);

export default router;
