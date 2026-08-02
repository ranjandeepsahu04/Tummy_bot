import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/dashboard', AnalyticsController.getDashboardStats);
router.get('/popular-items', AnalyticsController.getPopularItems);

export default router;
