

import { AuthService } from '../services/AuthService.js';
import { User, Tenant, Subscription, Administrator, AuditLog } from '../models/index.js';
import { Plan } from '../models/Plan.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import crypto from 'crypto';



export class AuthController {
  // Helper to send sanitized error responses (avoid exposing raw error payloads to clients)
  static sendSafeError(res, status, error, code = 'InternalServerError') {
    // Log detailed error server-side for diagnostics
    // eslint-disable-next-line no-console
    console.error('[AUTH ERROR]:', error);
    return res.status(status).json({ error: code, message: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
  }
  /**
   * Connexion spécifique pour le Maître du Kernel (SuperAdmin)
   */


  static async verifyMFA(req, res) {
    try {
      const { userId, code } = req.body;
      const user = await User.findByPk(userId);
      
      if (!user) return res.status(404).json({ error: 'UserNotFound' });

      if (!code || code.length !== 6) {
        return res.status(401).json({ error: 'InvalidCode', message: 'Code de sécurité incorrect.' });
      }

      const token = AuthService.generateToken(user);
      return res.status(200).json({ token, user });
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error);
    }
  }

  /**
   * Réinitialisation de mot de passe (ADMIN ONLY)
   */
  static async resetUserPassword(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 12) {
         await transaction.rollback();
         return res.status(400).json({ error: 'SecurityError', message: 'La nouvelle clé doit contenir au moins 12 caractères.' });
      }

      const where = { id };
      if (req.user.role !== 'SUPER_ADMIN') {
        where.tenantId = req.user.tenantId;
      }
      
      const user = await User.findOne({ where, transaction });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: 'UserNotFound', message: 'Utilisateur cible introuvable.' });
      }

      // Mise à jour cryptographique du hash avec un sel renforcé (cost: 12)
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      await user.update({ password: hashedPassword }, { transaction });

      // Audit de l'action critique scellé par signature SHA-256
      const auditPayload = {
        timestamp: Date.now(),
        targetId: user.id,
        operatorId: req.user.id,
        action: 'RESET_PASSWORD'
      };

      const signature = crypto.createHash('sha256')
        .update(JSON.stringify(auditPayload) + (process.env.AUDIT_SECRET || 'GSP_SECRET'))
        .digest('hex');

      await AuditLog.create({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        userName: req.user.name,
        action: 'USER_PASSWORD_RESET',
        resource: `User: ${user.email}`,
        severity: 'HIGH',
        status: 'SUCCESS',
        sha256Signature: signature
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ message: 'Identifiants scellés avec succès.' });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return AuthController.sendSafeError(res, 500, error, 'KernelPanic');
    }
  }

  /**
   * Activation/Désactivation MFA
   */
  static async toggleMFA(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ where: { id, tenantId: req.user.tenantId } });
      if (!user) return res.status(404).json({ error: 'UserNotFound' });

      user.mfaEnabled = !user.mfaEnabled;
      await user.save();

      return res.status(200).json({ mfaEnabled: user.mfaEnabled });
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error, 'AuthError');
    }
  }
  static async superAdminLogin(req, res) {
    try {
      const emailInput = (req.body.email || '').toLowerCase().trim();
      const passwordInput = (req.body.password || '').trim();
      
      console.log(`[KERNEL AUTH] Tentative: ${emailInput}`);

      const admin = await Administrator.findOne({ 
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('email')),
          '=',
          emailInput
        )
      });

      if (!admin) {
        console.warn(`[AUTH FAIL] Utilisateur inconnu: ${emailInput}`);
        return res.status(401).json({ error: 'Accès refusé', message: 'Identifiants Maîtres invalides.' });
      }

      // Comparaison rigoureuse
      // Support legacy stored bcrypt hashes that may miss the algorithm prefix
      let storedHash = admin.password || '';
      if (!storedHash.startsWith('$2') && /\d+\$/.test(storedHash)) {
        storedHash = `$2b$${storedHash}`;
      }
      const isValid = await bcrypt.compare(passwordInput, storedHash);
      
      if (!isValid) {
        console.warn(`[AUTH FAIL] Mot de passe erroné pour: ${emailInput}`);
        return res.status(401).json({ error: 'Accès refusé', message: 'Identifiants Maîtres invalides.' });
      }

      const token = AuthService.generateToken({
        id: admin.id,
        name: admin.name,
        tenantId: 'SYSTEM',
        roles: ['SUPER_ADMIN']
      });

      await admin.update({ lastLogin: new Date() });
      console.log(`[AUTH SUCCESS] Kernel ouvert pour: ${admin.name}`);

      return res.status(200).json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          role: 'SUPER_ADMIN',
          roles: ['SUPER_ADMIN'],
          tenantId: 'SYSTEM'
        }
      });
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error, 'AuthError');
    }
  }

static async login(req, res) {
    try {
      const email = (req.body.email || '').toLowerCase().trim();
      const password = (req.body.password || '').trim();
      
      const user = await AuthService.validateCredentials(email, password);

      if (!user) return res.status(401).json({ error: 'Identifiants invalides.' });
      // Bloquer les utilisateurs désactivés
      if (user.isActive === false || (user.dataValues && user.dataValues.is_active === false)) {
        return res.status(403).json({ error: 'AccountDisabled', message: 'Compte désactivé. Contactez un administrateur.' });
      }
      
      // 1. Récupération de l'état de l'instance (Tenant) et du Plan
      const tenant = await Tenant.findByPk(user.tenantId);
      if (!tenant) return res.status(404).json({ error: 'Instance introuvable.' });

      // 2. Blocage Flux-Paiement : Vérification si le compte est actif et à jour
      const isTrial = tenant.paymentStatus === 'TRIAL';
      const isUpToDate = tenant.paymentStatus === 'UP_TO_DATE' || isTrial;

      // If the tenant has been administratively deactivated, block access for everyone
      if (!tenant.isActive) {
        return res.status(403).json({ error: 'AccessBlocked', message: 'Instance désactivée. Contactez le support.' });
      }

      // If payments are not up-to-date, allow ADMIN or SUPER_ADMIN to login (for remediation), block others
      if (!isUpToDate) {
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'EMPLOYEE'];
        if (!(userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN'))) {
          return res.status(403).json({ 
            error: 'AccessBlocked', 
            message: 'Accès suspendu : Votre abonnement n’est pas à jour ou l’instance a été verrouillée. Veuillez régulariser votre situation dans l’onglet Paiement.' 
          });
        }
        // Admins are allowed to proceed
      }

      // 3. Récupération du Plan / Subscription depuis la table Subscription
      const sub = await Subscription.findOne({ where: { tenantId: user.tenantId } });
      const planId = sub ? sub.planId : 'FREE_TRIAL';
      // Récupérer les détails du plan pour exposer les modules/permissions
      let planDetails = null;
      if (sub && sub.planId) {
        const planRecord = await Plan.findByPk(sub.planId);
        if (planRecord) {
          planDetails = {
            id: planRecord.id,
            name: planRecord.name,
            priceMonthly: planRecord.priceMonthly,
            maxUsers: planRecord.maxUsers,
            hasAiChatbot: !!planRecord.hasAiChatbot,
            hasStockForecast: !!planRecord.hasStockForecast
          };
        }
      }

      // Update last login timestamp for the user and generate the token including planId
      try {
        await user.update({ lastLogin: new Date() });
      } catch (uErr) {
        // non-blocking: log but continue
        console.warn('[AUTH] Failed to update lastLogin for user', user.id, uErr && uErr.message);
      }

      // 4. Génération du token incluant le planId pour le frontend
      const token = AuthService.generateToken({
        ...user.toJSON(),
        planId: planId
      });

      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'EMPLOYEE'];

      // 5. Construire une réponse enrichie contenant l'état du tenant, de l'abonnement et les modules du plan
      const responseUser = {
        id: user.id,
        name: user.name,
        role: userRoles[0],
        roles: userRoles,
        tenantId: user.tenantId,
        isActive: user.isActive === undefined ? true : user.isActive,
        planId: planDetails?.id || (sub ? sub.planId : planId),
        subscription: sub ? { planId: sub.planId, status: sub.status, nextBillingDate: sub.nextBillingDate } : null,
        plan: planDetails,
        tenant: { isActive: tenant.isActive, paymentStatus: tenant.paymentStatus }
      };

      // Include lastLogin timestamp in response (snake_case compatibility)
      responseUser.lastLogin = user.lastLogin || user.last_login || null;
      responseUser.last_login = responseUser.lastLogin;
      

      return res.status(200).json({ token, user: responseUser });
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error);
    }
  }

  static async register(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const {
        companyName,
        company_name,
        siret,
        admin,
        planId,
        phone,
        address,
        primaryColor,
        primary_color,
        buttonColor,
        button_color,
        fontFamily,
        font_family,
        baseFontSize,
        base_font_size,
        theme
      } = req.body;

      const name = companyName || company_name || (admin && admin.companyName) || 'Nouvelle Entreprise';

      const tenant = await Tenant.create({
        name,
        siret,
        phone: phone ?? null,
        address: address ?? null,
        email: (admin && admin.email) || null,
        domain: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}.gestock.pro`,
        paymentStatus: planId === 'FREE_TRIAL' ? 'TRIAL' : 'PENDING',
        isActive: true,
        currency: 'F CFA',
        primaryColor: primaryColor || primary_color || undefined,
        buttonColor: buttonColor || button_color || undefined,
        fontFamily: fontFamily || font_family || undefined,
        baseFontSize: baseFontSize || base_font_size || undefined,
        theme: theme || undefined
      }, { transaction });

      const user = await User.create({
        email: admin.email,
        password: admin.password,
        name: admin.name || 'Propriétaire',
        role: 'ADMIN',
        roles: ['ADMIN'], 
        tenantId: tenant.id
      }, { transaction });

      await Subscription.create({
        tenantId: tenant.id,
        planId: planId || 'FREE_TRIAL',
        status: planId === 'FREE_TRIAL' ? 'TRIAL' : 'PENDING',
        nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }, { transaction });

      await transaction.commit();
      const token = AuthService.generateToken(user);

      return res.status(201).json({ 
        token,
        user: { 
          id: user.id, 
          name: user.name, 
          role: 'ADMIN', 
          roles: ['ADMIN'], 
          tenantId: tenant.id,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            primaryColor: tenant.primaryColor,
            buttonColor: tenant.buttonColor,
            theme: tenant.theme,
            fontFamily: tenant.fontFamily,
            baseFontSize: tenant.baseFontSize,
            isActive: tenant.isActive,
            paymentStatus: tenant.paymentStatus
          }
        },
        subscription: {
          planId: planId || 'FREE_TRIAL',
          status: planId === 'FREE_TRIAL' ? 'TRIAL' : 'PENDING'
        }
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      // Keep server logs, but return sanitized client message
      return AuthController.sendSafeError(res, 500, error, 'RegisterError');
    }
  }

  static async listUsers(req, res) {
    try {
      const users = await User.findAll({ where: { tenantId: req.user.tenantId } });
      return res.status(200).json(users);
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error);
    }
  }

  static async getUser(req, res) {
    try {
      const user = await User.findOne({ where: { id: req.params.id, tenantId: req.user.tenantId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(user);
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error);
    }
  }

  static async createUser(req, res) {
    try {
      const user = await User.create({ 
        ...req.body, 
        tenantId: req.user.tenantId 
      });
      return res.status(201).json(user);
    } catch (error) {
      // Validation/client errors can still return the message, but avoid object dumps
      // eslint-disable-next-line no-console
      console.error('[AUTH CREATE USER ERROR]:', error);
      return res.status(400).json({ error: 'BadRequest', message: 'Requête invalide.' });
    }
  }

  static async updateUser(req, res) {
    try {
      const user = await User.findOne({ where: { id: req.params.id, tenantId: req.user.tenantId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      // Empêcher la désactivation d'un ADMIN via l'API
      if ((req.body.hasOwnProperty('is_active') || req.body.hasOwnProperty('isActive')) && (req.body.is_active === false || req.body.isActive === false)) {
        const roles = Array.isArray(user.roles) ? user.roles : [user.role];
        if (roles.includes('ADMIN')) {
          return res.status(403).json({ error: 'Forbidden', message: 'Impossible de désactiver un administrateur.' });
        }
      }
      await user.update(req.body);
      return res.status(200).json(user);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AUTH UPDATE USER ERROR]:', error);
      return res.status(400).json({ error: 'BadRequest', message: 'Requête invalide.' });
    }
  }

  static async deleteUser(req, res) {
    try {
      const user = await User.findOne({ where: { id: req.params.id, tenantId: req.user.tenantId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      await user.destroy();
      return res.status(204).send();
    } catch (error) {
      return AuthController.sendSafeError(res, 500, error);
    }
  }
}
