import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateJwt, requireRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/customers', requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), UserController.getCustomers);
router.get('/admins', requireRoles(['SUPER_ADMIN']), UserController.getAdmins);
router.post('/admins', requireRoles(['SUPER_ADMIN']), UserController.createAdmin);
router.patch('/admins/:id/status', requireRoles(['SUPER_ADMIN']), UserController.toggleAdminStatus);

export default router;
