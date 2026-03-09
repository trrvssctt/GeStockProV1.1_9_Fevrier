
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

router.get('/me', async (req, res) => {
  try {
    const user = req.user; // Données du JWT
    
    // Si l'utilisateur a un employeeId, récupérer ses données Employee
    if (user.employeeId) {
      const { Employee } = await import('../models/index.js');
      const employee = await Employee.findOne({
        where: { 
          id: user.employeeId, 
          tenantId: user.tenantId 
        },
        attributes: ['id', 'firstName', 'lastName', 'email', 'position', 'departmentId', 'status']
      });
      
      if (employee) {
        // Enrichir user avec les données Employee
        return res.json({
          ...user,
          email: employee.email, // Email vient de Employee
          employee: employee.toJSON() // Données complètes Employee
        });
      }
    }
    
    // Sinon, vérifier si c'est un employé par rôle et chercher Employee par email/nom
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    const isEmployeeRole = roles.some(role => 
      ['EMPLOYEE', 'STOCK_MANAGER', 'SALES', 'ACCOUNTANT'].includes(role)
    );
    
    if (isEmployeeRole) {
      const { Employee, User } = await import('../models/index.js');
      
      // Récupérer User complet avec email depuis la DB
      const fullUser = await User.findByPk(user.id, {
        attributes: ['id', 'email', 'name', 'employeeId']
      });
      
      if (fullUser && fullUser.email) {
        // Chercher Employee par email
        const employee = await Employee.findOne({
          where: { 
            email: fullUser.email, 
            tenantId: user.tenantId 
          },
          attributes: ['id', 'firstName', 'lastName', 'email', 'position', 'departmentId', 'status']
        });
        
        if (employee) {
          // Mettre à jour user.employeeId en base automatiquement
          if (!fullUser.employeeId) {
            await fullUser.update({ employeeId: employee.id });
            console.log(`✅ Auto-linked user ${fullUser.id} to employee ${employee.id}`);
          }
          
          return res.json({
            ...user,
            email: fullUser.email,
            employeeId: employee.id,
            employee: employee.toJSON()
          });
        }
      }
    }
    
    // Par défaut, retourner user tel quel
    res.json(user);
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.json(req.user); // Fallback
  }
});

// Gestion utilisateurs
router.get('/users', checkRole(['ADMIN']), AuthController.listUsers);
router.get('/available-employees', checkRole(['ADMIN']), AuthController.getAvailableEmployees);
router.post('/users', checkRole(['ADMIN']), AuthController.createUser);
router.put('/users/:id', checkRole(['ADMIN']), AuthController.updateUser);
router.delete('/users/:id', checkRole(['ADMIN']), AuthController.deleteUser);

// Nouvelles actions de sécurité
router.post('/users/:id/reset-password', checkRole(['ADMIN']), AuthController.resetUserPassword);
router.post('/users/:id/toggle-mfa', checkRole(['ADMIN']), AuthController.toggleMFA);

export default router;
