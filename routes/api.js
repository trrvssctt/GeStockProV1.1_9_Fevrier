
import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.js';
import { tenantIsolation } from '../middlewares/tenant.js';
import { checkPermission } from '../middlewares/rbac.js';

import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import stockRoutes from './stock.routes.js';
import salesRoutes from './sales.routes.js';
import customerRoutes from './customers.routes.js';
import billingRoutes from './billing.routes.js';
import aiRoutes from './ai.routes.js';
import { AIController } from '../controllers/AIController.js';
import financeRoutes from './finance.routes.js';
import documentRoutes from './document.routes.js';
import resilienceRoutes from './resilience.routes.js';
import categoriesRoutes from './categories.routes.js';
import subcategoriesRoutes from './subcategories.routes.js';
import recoveryRoutes from './recovery.routes.js';
import servicesRoutes from './services.routes.js';
import { TenantController } from '../controllers/TenantController.js';
import { SubscriptionController } from '../controllers/SubscriptionController.js';
import { PaymentController } from '../controllers/PaymentController.js';

const router = Router();

// --- ROUTES PUBLIQUES ---
router.post('/payments/callback', PaymentController.handleWebhook); // Route callback globale
router.use('/auth', authRoutes);
router.get('/plans', SubscriptionController.listPlans); 
// Expose bridge as public to allow server-side forwarding from clients without requiring JWT
router.post('/ai/bridge', AIController.bridgeWebhook);

// --- PROTECTION JWT ---
router.use(authenticateJWT);

router.use('/admin', adminRoutes);
router.use('/stock', tenantIsolation, stockRoutes);
router.use('/categories', tenantIsolation, categoriesRoutes);
router.use('/subcategories', tenantIsolation, subcategoriesRoutes);
router.use('/sales', tenantIsolation, salesRoutes);
router.use('/customers', tenantIsolation, customerRoutes);
router.use('/billing', tenantIsolation, billingRoutes);
router.use('/ai', tenantIsolation, aiRoutes);
router.use('/finance', tenantIsolation, financeRoutes);
router.use('/documents', tenantIsolation, documentRoutes);
router.use('/resilience', tenantIsolation, resilienceRoutes);
router.use('/recovery', tenantIsolation, recoveryRoutes);
router.use('/services', tenantIsolation, servicesRoutes);

router.get('/settings', tenantIsolation, checkPermission(['ADMIN', 'SALES', 'STOCK_MANAGER', 'ACCOUNTANT']), TenantController.getSettings);
router.put('/settings', tenantIsolation, checkPermission(['ADMIN']), TenantController.updateSettings);

export default router;
