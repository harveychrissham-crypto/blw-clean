import express from 'express';
import {
  getLiveStream,
  updateLiveStream,
  recordLiveViewer,
  recordViewerHeartbeat,
  listLiveViewers,
} from '../controllers/liveController.js';
import { requireLeaderAdmin } from '../middleware/leaderAdminMiddleware.js';

const router = express.Router();

router.get('/', getLiveStream);
router.put('/', requireLeaderAdmin, updateLiveStream);
router.get('/viewers', requireLeaderAdmin, listLiveViewers);
router.post('/viewers', recordLiveViewer);
router.patch('/viewers/heartbeat', recordViewerHeartbeat);

export default router;
