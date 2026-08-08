import express from 'express';
import {
  getLiveStream,
  updateLiveStream,
  recordLiveViewer,
  recordViewerHeartbeat,
  listLiveViewers,
} from '../controllers/liveController.js';

const router = express.Router();

router.get('/', getLiveStream);
router.put('/', updateLiveStream);
router.get('/viewers', listLiveViewers);
router.post('/viewers', recordLiveViewer);
router.patch('/viewers/heartbeat', recordViewerHeartbeat);

export default router;
