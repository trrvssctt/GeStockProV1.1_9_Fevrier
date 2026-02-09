
import { Plan, Subscription, Tenant, AuditLog, Payment } from '../models/index.js';
import { sequelize } from '../config/database.js';
import crypto from 'crypto';

export class SubscriptionController {
  /**
   * Récupère les détails de l'abonnement actuel et l'historique des paiements du tenant
   */
  static async getMySubscription(req, res) {
    try {
      const tenantId = req.user.tenantId;

      const subscription = await Subscription.findOne({
        where: { tenantId }
      });

      const payments = await Payment.findAll({
        where: { 
          tenantId,
          saleId: null // Filtre pour ne prendre que les paiements hors-ventes (abonnements)
        },
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        subscription,
        payments
      });
    } catch (error) {
      return res.status(500).json({ error: 'FetchError', message: error.message });
    }
  }

  /**
   * Récupère tous les plans actifs
   */
  static async listPlans(req, res) {
    try {
      const dbPlans = await Plan.findAll({
        where: { isActive: true },
        order: [['priceMonthly', 'ASC']]
      });
      
      if (!dbPlans || dbPlans.length === 0) {
        return res.status(200).json([
          { id: 'FREE_TRIAL', name: 'Essai Gratuit', price: 0, maxUsers: 5, hasAiChatbot: true, hasStockForecast: true },
          { id: 'BASIC', name: 'Starter AI', price: 30000, maxUsers: 1, hasAiChatbot: false, hasStockForecast: false },
          { id: 'PRO', name: 'Business Pro', price: 85000, maxUsers: 5, hasAiChatbot: true, hasStockForecast: true, isPopular: true },
          { id: 'ENTERPRISE', name: 'Enterprise Cloud', price: 250000, maxUsers: 100, hasAiChatbot: true, hasStockForecast: true }
        ]);
      }

      return res.status(200).json(dbPlans.map(p => ({
        id: p.id,
        name: p.name,
        price: p.priceMonthly,
        maxUsers: p.maxUsers,
        hasAiChatbot: p.hasAiChatbot,
        hasStockForecast: p.hasStockForecast,
        isPopular: p.id === 'PRO'
      })));
    } catch (error) {
      return res.status(200).json([
        { id: 'PRO', name: 'Business Pro (Fallback)', price: 85000, maxUsers: 5, hasAiChatbot: true, hasStockForecast: true, isPopular: true }
      ]);
    }
  }

  /**
   * Gère l'upgrade d'abonnement d'un Tenant avec enregistrement du paiement
   */
  static async upgradePlan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { planId, paymentMethod, transactionId } = req.body;
      const tenantId = req.user.tenantId;

      const tenant = await Tenant.findByPk(tenantId, { transaction });
      const plan = await Plan.findByPk(planId, { transaction });

      if (!tenant || !plan) throw new Error('Tenant ou Plan introuvable.');

      // 1. Ne pas créer de Payment ici — la persistance du paiement
      // se fera lors de la validation manuelle par le SuperAdmin.
      // On marque néanmoins le tenant comme PENDING (attente validation).
      await tenant.update({ 
        paymentStatus: 'PENDING'
      }, { transaction });

      // 3. Mise à jour ou création de la Subscription en statut PENDING
      let sub = await Subscription.findOne({ where: { tenantId }, transaction });
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      if (sub) {
        await sub.update({
          planId: planId,
          status: 'PENDING',
          nextBillingDate: nextBilling
        }, { transaction });
      } else {
        await Subscription.create({
          tenantId,
          planId,
          status: 'PENDING',
          nextBillingDate: nextBilling,
          autoRenew: true
        }, { transaction });
      }

      // 4. Audit (requête d'upgrade, pas d'activation)
      await AuditLog.create({
        tenantId,
        userId: req.user?.id || null,
        userName: req.user?.name || 'SYSTEM',
        action: 'SUBSCRIPTION_UPGRADE_REQUEST',
        resource: `Plan: ${planId}`,
        severity: 'LOW',
        sha256Signature: crypto.createHash('sha256').update(`${tenantId}:${planId}:${Date.now()}`).digest('hex')
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        message: `Demande d'upgrade vers le plan ${plan.name} enregistrée en attente de validation.`,
        tenant: { paymentStatus: 'PENDING' }
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return res.status(500).json({ error: 'UpgradeError', message: error.message });
    }
  }

  /**
   * Simulation de téléchargement de facture d'abonnement
   */
  static async downloadSubscriptionInvoice(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findOne({ where: { id: paymentId, tenantId: req.user.tenantId, saleId: null } });
      
      if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });

      const tenant = await Tenant.findByPk(req.user.tenantId);
      const sub = await Subscription.findOne({ where: { tenantId: req.user.tenantId } });
      const plan = await Plan.findByPk(sub.planId);

      // Simule un retour PDF (Contenu Factur-X)
      return res.status(200).json({
        message: 'Facture d\'abonnement générée.',
        invoiceId: `F-SUB-${payment.id.slice(0,8).toUpperCase()}`,
        amount: payment.amount,
        date: payment.paymentDate || payment.createdAt,
        tenant: tenant,
        plan: plan,
        paymentMethod: payment.method
      });
    } catch (error) {
      return res.status(500).json({ error: 'InvoiceError', message: error.message });
    }
  }
}
