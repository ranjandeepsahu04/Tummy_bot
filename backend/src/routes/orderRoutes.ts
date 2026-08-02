import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', OrderController.getOrders);
router.get('/export/csv', OrderController.exportCsv);
router.get('/:id', OrderController.getOrderById);
router.patch('/:id/status', OrderController.updateStatus);

export default router;
