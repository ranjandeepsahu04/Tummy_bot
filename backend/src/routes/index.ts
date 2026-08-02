import { Router } from 'express';
import authRoutes from './authRoutes';
import webhookRoutes from './webhookRoutes';
import orderRoutes from './orderRoutes';
import catalogRoutes from './catalogRoutes';
import userRoutes from './userRoutes';
import analyticsRoutes from './analyticsRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/webhook', webhookRoutes);
router.use('/orders', orderRoutes);
router.use('/catalog', catalogRoutes);
router.use('/users', userRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
