import express from 'express';
import { listContent, createContent } from '../controllers/contentController.js';

const router = express.Router();

router.get('/', listContent);
router.post('/', createContent);

export default router;
