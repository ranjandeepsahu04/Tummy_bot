import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/me', authenticateJwt, AuthController.me);
router.post('/logout', authenticateJwt, AuthController.logout);

export default router;
