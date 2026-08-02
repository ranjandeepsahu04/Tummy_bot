import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';
import { authenticateJwt, requireRoles } from '../middlewares/authMiddleware';

const router = Router();

// Public / Unauthenticated lookup for options if needed
router.get('/zones', CatalogController.getZones);
router.get('/restaurants', CatalogController.getRestaurants);
router.get('/categories', CatalogController.getCategories);
router.get('/food-items', CatalogController.getFoodItems);
router.get('/coupons', CatalogController.getCoupons);
router.get('/pickup-slots', CatalogController.getPickupSlots);

// Admin authenticated CRUD operations
router.post('/zones', authenticateJwt, requireRoles(['SUPER_ADMIN']), CatalogController.createZone);
router.post('/blocks', authenticateJwt, requireRoles(['SUPER_ADMIN']), CatalogController.createBlock);

router.post('/restaurants', authenticateJwt, requireRoles(['SUPER_ADMIN']), CatalogController.createRestaurant);
router.put('/restaurants/:id', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), CatalogController.updateRestaurant);

router.post('/categories', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), CatalogController.createCategory);

router.post('/food-items', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), CatalogController.createFoodItem);
router.put('/food-items/:id', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_STAFF']), CatalogController.updateFoodItem);
router.delete('/food-items/:id', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), CatalogController.deleteFoodItem);

router.post('/coupons', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), CatalogController.createCoupon);
router.post('/pickup-slots', authenticateJwt, requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']), CatalogController.createPickupSlot);

export default router;
