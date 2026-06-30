import express from 'express';
import multer from 'multer';
import { uploadPhoto } from '../controllers/uploadController.js';

const router = express.Router();

// Keep the file in memory (no temp files on disk) and cap size at 5MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', upload.single('photo'), uploadPhoto);

export default router;
