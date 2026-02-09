
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticateJWT } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/rbac.js';

const router = Router();

// --- ROUTES PUBLIQUES ---
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/superadmin/login', AuthController.superAdminLogin);
router.post('/mfa/verify', AuthController.verifyMFA); // Nouveau flux MFA

// --- ROUTES PROTÉGÉES (IAM) ---
router.use(authenticateJWT);

router.get('/me', (req, res) => res.json(req.user));

// Gestion utilisateurs
router.get('/users', checkRole(['ADMIN']), AuthController.listUsers);
router.post('/users', checkRole(['ADMIN']), AuthController.createUser);
router.put('/users/:id', checkRole(['ADMIN']), AuthController.updateUser);
router.delete('/users/:id', checkRole(['ADMIN']), AuthController.deleteUser);

// Nouvelles actions de sécurité
router.post('/users/:id/reset-password', checkRole(['ADMIN']), AuthController.resetUserPassword);
router.post('/users/:id/toggle-mfa', checkRole(['ADMIN']), AuthController.toggleMFA);

export default router;
