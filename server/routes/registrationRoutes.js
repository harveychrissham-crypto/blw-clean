import express from 'express';
import { submitRegistration } from '../controllers/registrationController.js';

const router = express.Router();
router.post('/', submitRegistration);

export default router;
