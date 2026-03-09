import express from 'express';
import { DeclarationController } from '../controllers/DeclarationController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';
import { tenantIsolation } from '../middlewares/tenant.js';

const router = express.Router();

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware);
router.use(tenantIsolation);

// === ROUTES PARAMÈTRES DE DÉCLARATION ===
router.get('/settings', DeclarationController.getDeclarationSettings);
router.put('/settings', DeclarationController.updateDeclarationSettings);

// === ROUTES GESTION DES DÉCLARATIONS ===
router.get('/', DeclarationController.getDeclarations);
router.get('/dashboard', DeclarationController.getDeclarationsDashboard);
router.post('/', DeclarationController.createDeclaration);
router.get('/:id', DeclarationController.getDeclaration);
router.put('/:id', DeclarationController.updateDeclaration);
router.delete('/:id', DeclarationController.deleteDeclaration);

// === ROUTES ACTIONS SPÉCIFIQUES ===
router.post('/:id/submit', DeclarationController.submitDeclaration);
router.post('/:id/calculate', DeclarationController.calculateDeclarationAmounts);
router.post('/generate-monthly', DeclarationController.generateMonthlyDeclarations);

export default router;