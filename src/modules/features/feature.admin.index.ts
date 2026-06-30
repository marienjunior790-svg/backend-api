import { Router } from 'express';
import featureRoutes from '../features/feature.routes.js';
import featureAdminRoutes from '../features/feature.admin.routes.js';
import adminUsersRoutes from '../admin/admin.routes.js';

const router = Router();

router.use('/features', featureRoutes);
router.use('/users', adminUsersRoutes);
router.use('/users/:id/features', featureAdminRoutes);

export default router;
