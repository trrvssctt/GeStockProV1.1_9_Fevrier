
import { Router } from 'express';
import { SubcategoryController } from '../controllers/SubcategoryController.js';
import { checkPermission } from '../middlewares/rbac.js';

const router = Router();

// Lecture : Ouvert aux Admins, Managers et Employés
router.get('/', checkPermission(['ADMIN', 'STOCK_MANAGER', 'EMPLOYEE']), SubcategoryController.list);

// Écriture : Autorisé pour ADMIN et STOCK_MANAGER
router.post('/', checkPermission(['ADMIN', 'STOCK_MANAGER']), SubcategoryController.create);
router.put('/:id', checkPermission(['ADMIN', 'STOCK_MANAGER']), SubcategoryController.update);
router.delete('/:id', checkPermission(['ADMIN', 'STOCK_MANAGER']), SubcategoryController.delete);

export default router;
