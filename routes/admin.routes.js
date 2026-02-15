

import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { checkRole } from '../middlewares/rbac.js';


const router = Router();


// Allow both tenant-level ADMIN and SUPER_ADMIN to access dashboard KPIs
router.use((req, res, next) => checkRole(['SUPER_ADMIN', 'ADMIN'])(req, res, next));


// Dashboard
router.get('/dashboard', AdminController.getGlobalDashboard);


// Tenants
router.get('/tenants', AdminController.listTenants);
router.get('/tenants/:id/billing', AdminController.getTenantBillingDetails);
router.get('/tenants/:id/users', AdminController.listUsersForTenant);
router.post('/tenants/:id/toggle-lock', AdminController.toggleTenantLock);
router.post('/tenants/:id/subscription/validate', AdminController.validateSubscription);

// Logs / Audit
router.get('/logs', AdminController.getLogs);


// Plans CRUD
router.get('/plans', AdminController.listPlans);
router.post('/plans', AdminController.createPlan);
router.put('/plans/:id', AdminController.updatePlan);
router.delete('/plans/:id', AdminController.deletePlan);


// Communication
router.post('/email/send', AdminController.sendEmailToOwner);


export default router;
