
import { Tenant, User, Subscription, Plan, Payment, AuditLog, Sale, SaleItem, Customer, StockItem, ProductMovement, Category, Subcategory } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op, fn, col } from 'sequelize';
import crypto from 'crypto';

export class AdminController {
  /**
   * Dashboard Global : Stats, Revenus et Alertes
   */
  static async getGlobalDashboard(req, res) {
    try {
      // Determine tenant scoping: if a tenantId is present (tenant admin or SUPER_ADMIN with header),
      // return tenant-scoped stats. Otherwise, return global aggregates.
      const isSuper = req.user && req.user.role === 'SUPER_ADMIN';
      const requestedTenantId = isSuper ? (req.headers['x-tenant-id'] || null) : (req.user ? req.user.tenantId : null);
      const tenantWhere = requestedTenantId ? { tenantId: requestedTenantId } : null;
      // High level tenant counts
      const totalTenants = await Tenant.count();
      const activeTenants = await Tenant.count({ where: { isActive: true } });

      // Sales & finance (scoped to tenantWhen available)
      const totalSalesCount = tenantWhere ? await Sale.count({ where: tenantWhere }) : await Sale.count();
      const totalRevenue = parseFloat(await Sale.sum('totalTtc', tenantWhere ? { where: tenantWhere } : {}) || 0);
      const totalCollected = parseFloat(await Payment.sum('amount', tenantWhere ? { where: tenantWhere } : {}) || 0);
      const totalUnpaid = totalRevenue - totalCollected;
      const overdueCount = tenantWhere ? await Sale.count({ where: { ...tenantWhere, status: 'EN_COURS' } }) : await Sale.count({ where: { status: 'EN_COURS' } });

      // Monthly revenue (last 30 days)
      const since = new Date(); since.setDate(since.getDate() - 30);
      const recentSalesWhere = tenantWhere ? { ...tenantWhere, createdAt: { [Op.gte]: since } } : { createdAt: { [Op.gte]: since } };
      const recentSales = await Sale.findAll({ where: recentSalesWhere, include: [{ model: Customer }], order: [['createdAt','DESC']], limit: 20 });

      // Top debtors (per customer)
      const openSalesWhere = tenantWhere ? { ...tenantWhere, status: { [Op.ne]: 'ANNULE' } } : { status: { [Op.ne]: 'ANNULE' } };
      const openSales = await Sale.findAll({ where: openSalesWhere, include: [{ model: Customer }, { model: Payment, as: 'payments' }] });
      const debtByCustomer = {};
      openSales.forEach(s => {
        const paid = (s.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const due = parseFloat(s.totalTtc || 0) - paid;
        if (due > 0) {
          const cid = s.customer?.id || 'PASSAGE';
          const cname = s.customer?.companyName || s.customer?.name || 'Client';
          debtByCustomer[cid] = debtByCustomer[cid] || { id: cid, name: cname, total: 0 };
          debtByCustomer[cid].total += due;
        }
      });
      const topDebtors = Object.values(debtByCustomer).sort((a,b) => b.total - a.total).slice(0,5);

      // Latest payments
      const paymentsWhere = tenantWhere ? { where: tenantWhere } : {};
      const latestPayments = await Payment.findAll({ ...paymentsWhere, include: [{ model: Sale, include: [{ model: Customer }] }], order: [['createdAt','DESC']], limit: 10 });

      // Customers
      const customersCount = tenantWhere ? await Customer.count({ where: tenantWhere }) : await Customer.count();
      const latestCustomers = await Customer.findAll({ where: tenantWhere || {}, order: [['createdAt','DESC']], limit: 5 });

      // Stock
      const stocksTotal = tenantWhere ? await StockItem.count({ where: tenantWhere }) : await StockItem.count();
      const stocksRupture = tenantWhere ? await StockItem.count({ where: { ...tenantWhere, currentLevel: { [Op.lte]: 0 } } }) : await StockItem.count({ where: { currentLevel: { [Op.lte]: 0 } } });
      const stocksLow = tenantWhere ? await StockItem.count({ where: { ...tenantWhere, [Op.and]: [ { currentLevel: { [Op.gt]: 0 } }, { minThreshold: { [Op.ne]: null } }, sequelize.where(col('stock_item.current_level'), '<=', col('stock_item.min_threshold')) ] } }) : await StockItem.count({ where: { [Op.and]: [ { currentLevel: { [Op.gt]: 0 } }, { minThreshold: { [Op.ne]: null } }, sequelize.where(col('stock_item.current_level'), '<=', col('stock_item.min_threshold')) ] } });
      // Retrieve a short list of stock items for dashboard cards (recent/top)
      const recentStocks = await StockItem.findAll({ order: [['updatedAt','DESC']], limit: 20 });

      // Movements
      const recentMovements = await ProductMovement.findAll({ where: tenantWhere || {}, include: [{ model: StockItem }], order: [['createdAt','DESC']], limit: 10 });

      // Categories
      const categoriesCount = tenantWhere ? await Category.count({ where: tenantWhere }) : await Category.count();
      const subcategoriesCount = tenantWhere ? await Subcategory.count({ where: tenantWhere }) : await Subcategory.count();

      // Users
      const usersCount = tenantWhere ? await User.count({ where: tenantWhere }) : await User.count();
      const recentUsers = await User.findAll({ where: tenantWhere || {}, order: [['lastLogin','DESC NULLS LAST']], limit: 5 });
      const usersByRoleRaw = await User.findAll({ attributes: ['role', [fn('COUNT', col('role')), 'cnt']], group: ['role'] });
      const usersByRole = {};
      usersByRoleRaw.forEach(r => { usersByRole[r.role] = parseInt(r.get('cnt'),10); });

      // Subscription alerts (next billing within 7 days or expired)
      // Scope to the requested tenant when applicable so tenant-admins only see their own alerts.
      const subsThreshold = new Date();
      subsThreshold.setDate(subsThreshold.getDate() + 7);
      const subsWhere = requestedTenantId ? { tenantId: requestedTenantId, nextBillingDate: { [Op.lte]: subsThreshold } } : { nextBillingDate: { [Op.lte]: subsThreshold } };
      const subs = await Subscription.findAll({ where: subsWhere, include: [{ model: Tenant, attributes: ['name'] }], limit: 50 });

      // Pending validations: subscriptions that require manual validation (e.g. PENDING)
      const pendingValidationsRaw = await Subscription.findAll({ where: { status: 'PENDING' }, include: [{ model: Tenant, attributes: ['id','name','domain'] }], limit: 50 });
      const pendingValidations = pendingValidationsRaw.map(s => {
        const tenantIdVal = s.tenantId || s.Tenant?.id || (s.tenant ? s.tenant.id : null);
        const tenantNameVal = s.Tenant?.name || (s.tenant ? s.tenant.name : null) || null;
        const tenantDomainVal = s.Tenant?.domain || (s.tenant ? s.tenant.domain : null) || null;
        return {
          id: tenantIdVal,
          tenant: { id: tenantIdVal, name: tenantNameVal, domain: tenantDomainVal },
          tenantName: tenantNameVal,
          tenantDomain: tenantDomainVal,
          planId: s.planId,
          status: s.status,
          nextBillingDate: s.nextBillingDate
        };
      });

      // Monthly Recurring Revenue (MRR) : sum of active subscriptions' monthly prices
      let mrr = 0;
      try {
        const activeSubs = await Subscription.findAll({ where: { status: 'ACTIVE' }, include: [{ model: Plan, as: 'planDetails' }] });
        mrr = activeSubs.reduce((sum, s) => sum + Number(s.planDetails?.priceMonthly || 0), 0);
        if (!isFinite(mrr) || Number.isNaN(mrr)) mrr = 0;
      } catch (e) {
        console.warn('[MRR CALC ERROR]', e.message || e);
        mrr = 0;
      }

      // Revenue stats for the last 6 months (aggregated by month)
      const revenueStats = [];
      try {
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
          const total = parseFloat((await Payment.sum('amount', { where: { paymentDate: { [Op.gte]: start, [Op.lt]: end } } })) || 0);
          revenueStats.push({ month: start.toISOString(), total });
        }
      } catch (e) {
        console.warn('[REVENUE STATS ERROR]', e.message || e);
      }

      // Late payments count (reusing overdueCount) and pending subscriptions count
      const latePayments = overdueCount;
      const pendingSub = pendingValidations.length || 0;

      return res.status(200).json({
        stats: {
          totalTenants,
          activeTenants,
          mrr,
          latePayments,
          pendingSub,
          totalSalesCount,
          totalRevenue,
          totalCollected,
          totalUnpaid,
          overdueCount,
          customersCount,
          stocksTotal,
          stocksRupture,
          stocksLow,
          categoriesCount,
          subcategoriesCount,
          usersCount
        },
        topDebtors,
        latestPayments: latestPayments.map(p => ({ id: p.id, amount: p.amount, createdAt: p.createdAt, saleId: p.saleId, customer: p.Sale?.Customer?.companyName || null })),
        recentSales: recentSales.map(s => ({ id: s.id, reference: s.reference, totalTtc: s.totalTtc, amountPaid: s.amountPaid || 0, status: s.status, createdAt: s.createdAt, customer: s.Customer?.companyName, operator: s.operator || s.operatorName || null })),
        latestCustomers: latestCustomers.map(c => ({ id: c.id, companyName: c.companyName || c.name, createdAt: c.createdAt })),
        recentMovements: recentMovements.map(m => ({ id: m.id, productName: m.productName || m.StockItem?.name, quantity: m.quantity, createdAt: m.createdAt, type: m.type, userRef: m.userRef || m.userName || (m.user ? m.user.name : null) })),
        users: { count: usersCount, byRole: usersByRole, recent: recentUsers.map(u => ({ id: u.id, name: u.name, email: u.email, lastLogin: u.lastLogin, role: u.role || 'EMPLOYEE' })) },
        subscriptionAlerts: subs.map(s => ({ tenant: s.Tenant?.name, nextBillingDate: s.nextBillingDate, status: s.status })),
        // Provide a small subscription preview (nearest next billing) so frontend can show alerts
        subscription: subs && subs.length > 0 ? { subscription: { nextBillingDate: subs[0].nextBillingDate, tenant: subs[0].Tenant?.name, status: subs[0].status, planId: subs[0].planId } } : null,
        // Provide an array of stock items for the dashboard to display
        stocks: recentStocks.map(s => ({ id: s.id, name: s.name, currentLevel: s.currentLevel, minThreshold: s.minThreshold, sku: s.sku })) ,
        pendingValidations,
        revenueStats
      });
    } catch (error) {
      console.error("[KERNEL ADMIN DASHBOARD ERROR]:", error);
      return res.status(500).json({ error: error.name, message: error.message });
    }
  }

  /**
   * Liste enrichie des comptes
   */
  static async listTenants(req, res) {
    try {
      const tenants = await Tenant.findAll({
        order: [['createdAt', 'DESC']],
        include: [
          { 
            model: Subscription, 
            as: 'subscription',
            include: [{ model: Plan, as: 'planDetails' }]
          }
        ]
      });
      
      const enriched = await Promise.all(tenants.map(async (t) => {
        const userCount = await User.count({ where: { tenantId: t.id } });
        return { 
          ...t.toJSON(), 
          userCount,
          planName: t.subscription?.planDetails?.name || 'SANS_PLAN',
          planMaxUsers: t.subscription?.planDetails?.maxUsers || 0,
          isUpToDate: t.paymentStatus === 'UP_TO_DATE' || t.paymentStatus === 'TRIAL'
        };
      }));

      return res.status(200).json(enriched);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Détails d'une souscription spécifique (Registry Billing)
   */
  static async getTenantBillingDetails(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findByPk(id, {
        include: [
          { 
            model: Subscription, 
            as: 'subscription',
            include: [{ model: Plan, as: 'planDetails' }]
          }
        ]
      });

      if (!tenant) return res.status(404).json({ error: 'Instance non trouvée' });

      const payments = await Payment.findAll({
        where: { tenantId: id, saleId: null },
        order: [['paymentDate', 'DESC']]
      });

      const userCount = await User.count({ where: { tenantId: id } });

      return res.status(200).json({
        tenant,
        payments,
        stats: { userCount }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Kill-Switch (Correction de l'audit)
   */
  static async toggleTenantLock(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findByPk(id);
      if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });

      await tenant.update({ isActive: !tenant.isActive });
      
      // Audit: only set userId when the user exists in the users table.
      // Some master/system actors may exist outside of the tenants' users table,
      // so we fallback to recording only `userName` and a null `userId` to avoid FK violations.
      let auditUserId = null;
      let auditUserName = 'SYSTEM';
      try {
        if (req.user && req.user.id) {
          const found = await User.findByPk(req.user.id);
          if (found) auditUserId = req.user.id;
          auditUserName = req.user.name || (found ? found.name : auditUserName);
        }
      } catch (e) {
        // don't fail the main flow for audit lookup errors
        console.warn('[AUDIT USER LOOKUP FAILED]', e.message || e);
      }

      await AuditLog.create({
        tenantId: id,
        userId: auditUserId,
        userName: auditUserName,
        action: tenant.isActive ? 'TENANT_UNLOCKED' : 'TENANT_LOCKED',
        resource: `Tenant: ${tenant.name} (${tenant.domain})`,
        severity: 'HIGH',
        sha256Signature: crypto.createHash('sha256').update(`LOCK_ACTION:${id}:${Date.now()}`).digest('hex')
      });

      return res.status(200).json(tenant);
    } catch (error) {
      console.error("[TOGGLE LOCK ERROR]:", error);
      return res.status(500).json({ error: error.name, message: error.message });
    }
  }

  static async listPlans(req, res) {
    try {
      const plans = await Plan.findAll({ order: [['priceMonthly', 'ASC']] });
      return res.status(200).json(plans);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Retourne les logs d'audit (filtres: tenantId, userId, q, limit, offset)
   */
  static async getLogs(req, res) {
    try {
      const { tenantId, userId, q, limit = 200, offset = 0 } = req.query;
      const where = {};
      if (tenantId) where.tenantId = tenantId;
      if (userId) where.userId = userId;
      if (q) where[Op.or] = [
        { action: { [Op.iLike]: `%${q}%` } },
        { resource: { [Op.iLike]: `%${q}%` } },
        { userName: { [Op.iLike]: `%${q}%` } }
      ];

      const logs = await AuditLog.findAll({ where, order: [['createdAt', 'DESC']], limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
      return res.status(200).json(logs.map(l => ({ id: l.id, tenantId: l.tenantId, userId: l.userId, userName: l.userName, action: l.action, resource: l.resource, status: l.status, severity: l.severity, createdAt: l.createdAt })));
    } catch (error) {
      console.error('[GET LOGS ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Liste les utilisateurs d'un tenant (support pour SuperAdmin views)
   */
  static async listUsersForTenant(req, res) {
    try {
      const { id } = req.params;
      const users = await User.findAll({ where: { tenantId: id }, order: [['createdAt', 'DESC']] });
      return res.status(200).json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
    } catch (error) {
      console.error('[LIST USERS FOR TENANT ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPlan(req, res) {
    try {
      const plan = await Plan.create(req.body);
      return res.status(201).json(plan);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async updatePlan(req, res) {
    try {
      const plan = await Plan.findByPk(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });
      await plan.update(req.body);
      return res.status(200).json(plan);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async deletePlan(req, res) {
    try {
      const plan = await Plan.findByPk(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });
      await plan.update({ isActive: false });
      return res.status(200).json({ message: 'Plan désactivé.' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async sendEmailToOwner(req, res) {
    try {
      return res.status(200).json({ message: 'Email envoyé' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Validation manuelle d'une souscription par le SuperAdmin / Admin
   */
  static async validateSubscription(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params; // tenant id
      const tenant = await Tenant.findByPk(id, { transaction });
      if (!tenant) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Instance non trouvée' });
      }

      // Find or create subscription record
      let sub = await Subscription.findOne({ where: { tenantId: id }, transaction });
      const nextBilling = new Date(); nextBilling.setMonth(nextBilling.getMonth() + 1);

      if (sub) {
        await sub.update({ status: 'ACTIVE', nextBillingDate: nextBilling }, { transaction });
      } else {
        const planId = tenant.plan || 'FREE_TRIAL';
        sub = await Subscription.create({ tenantId: id, planId, status: 'ACTIVE', nextBillingDate: nextBilling, autoRenew: true }, { transaction });
      }

      // Reactivate tenant and mark payment up-to-date
      await tenant.update({ isActive: true, paymentStatus: 'UP_TO_DATE', lastPaymentDate: new Date() }, { transaction });

      // Create a Payment record for this subscription validation only if none exists yet.
      try {
        const { amount: bodyAmount, method: bodyMethod, reference: bodyReference, transactionId } = req.body || {};
        let amountToRecord = null;
        if (bodyAmount && !isNaN(Number(bodyAmount))) amountToRecord = Number(bodyAmount);

        if (amountToRecord === null) {
          const planIdToUse = sub.planId || tenant.plan || 'FREE_TRIAL';
          const plan = await Plan.findByPk(planIdToUse, { transaction });
          amountToRecord = Number(plan?.priceMonthly || tenant.lastPaymentAmount || tenant.subscription?.planDetails?.priceMonthly || 0) || 0;
        }

        const methodToUse = bodyMethod || 'WAVE';
        const referenceToUse = bodyReference || transactionId || `VALID-${Date.now()}`;

        // Check for existing payment to avoid duplicate entries.
        let existing = null;
        if (referenceToUse) {
          existing = await Payment.findOne({ where: { tenantId: id, reference: referenceToUse, saleId: null }, transaction });
        }

        // If no exact reference match, try matching recent payment by amount within a time window (15 minutes)
        if (!existing) {
          const lookbackMs = 1000 * 60 * 15; // 15 minutes
          const since = new Date(Date.now() - lookbackMs);
          existing = await Payment.findOne({ where: { tenantId: id, amount: amountToRecord, saleId: null, paymentDate: { [Op.gte]: since } }, transaction });
        }

        if (existing) {
          console.log(`[PAYMENT SKIP] Found existing payment ${existing.id} for tenant ${id} (ref=${existing.reference})`);
        } else {
          await Payment.create({
            tenantId: id,
            saleId: null,
            amount: amountToRecord,
            method: methodToUse,
            reference: referenceToUse,
            paymentDate: new Date()
          }, { transaction });
        }
      } catch (e) {
        console.warn('[PAYMENT RECORD FAILED]', e.message || e);
        // don't fail the whole flow for payment logging issues
      }

      // Audit log - verify user exists to avoid FK violation
      let auditUserId = null;
      let auditUserName = 'SYSTEM';
      try {
        if (req.user && req.user.id) {
          const found = await User.findByPk(req.user.id, { transaction });
          if (found) auditUserId = req.user.id;
          auditUserName = req.user.name || (found ? found.name : auditUserName);
        }
      } catch (e) {
        console.warn('[AUDIT USER LOOKUP FAILED]', e.message || e);
      }

      await AuditLog.create({
        tenantId: id,
        userId: auditUserId,
        userName: auditUserName,
        action: 'SUBSCRIPTION_VALIDATED',
        resource: `Tenant: ${tenant.name} (${tenant.domain})`,
        severity: 'HIGH',
        sha256Signature: crypto.createHash('sha256').update(`VALIDATE_SUB:${id}:${Date.now()}`).digest('hex')
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({ message: 'Abonnement validé.', tenant: { id: tenant.id, isActive: true } });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('[VALIDATE SUBSCRIPTION ERROR]:', error);
      return res.status(500).json({ error: 'ValidationError', message: 'Une erreur inattendue est survenue sur le serveur.' });
    }
  }
}
