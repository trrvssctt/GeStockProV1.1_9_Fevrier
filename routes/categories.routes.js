
import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController.js';
import { checkPermission } from '../middlewares/rbac.js';

const router = Router();

// Lecture : Ouvert aux Admins, Managers et Employés
router.get('/', checkPermission(['ADMIN', 'STOCK_MANAGER', 'EMPLOYEE']), CategoryController.list);

// Écriture : Autorisé pour ADMIN et STOCK_MANAGER
router.post('/', checkPermission(['ADMIN', 'STOCK_MANAGER']), CategoryController.create);
router.put('/:id', checkPermission(['ADMIN', 'STOCK_MANAGER']), CategoryController.update);
router.delete('/:id', checkPermission(['ADMIN', 'STOCK_MANAGER']), CategoryController.delete);

export default router;
