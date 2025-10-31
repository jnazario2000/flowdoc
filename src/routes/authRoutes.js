import { Router } from 'express';
import { authController } from '../controllers/authController.js';

const router = Router();

router.post('/auth/signup', authController.signup);
router.post('/auth/signin', authController.signin);
router.get('/auth/me', authController.getCurrentUser);

export default router;

