
import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController.js';
import { checkPermission } from '../middlewares/rbac.js';

const router = Router();

// Lecture : Inclure STOCK_MANAGER pour identifier le destinataire des sorties
router.get('/', checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT', 'EMPLOYEE', 'STOCK_MANAGER']), CustomerController.list);
router.get('/:id', checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT', 'EMPLOYEE', 'STOCK_MANAGER']), CustomerController.getDetails);

// Écriture : ADMIN, SALES
router.post('/', checkPermission(['ADMIN', 'SALES']), CustomerController.create);
router.put('/:id', checkPermission(['ADMIN', 'SALES']), CustomerController.update);

// Suppression : Uniquement ADMIN
router.delete('/:id', checkPermission(['ADMIN']), CustomerController.delete);

export default router;
