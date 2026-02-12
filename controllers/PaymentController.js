
import { Tenant, Subscription, Payment } from '../models/index.js';
import { StripeService } from '../services/StripeService.js';

export class PaymentController {
  static async handleWebhook(req, res) {
    let provider, status, tenantId, amount, transactionId, planId;

    try {
      // Détection webhook Stripe
      const stripeSig = req.headers['stripe-signature'];
      if (stripeSig && process.env.STRIPE_WEBHOOK_SECRET) {
        const event = StripeService.constructEvent(req.body, stripeSig);
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          provider = 'STRIPE';
          status = 'SUCCESS';
          tenantId = session.metadata?.tenantId;
          planId = session.metadata?.planId;
          transactionId = session.id;
          amount = (session.amount_total || 0) / 100;
        } else {
          return res.status(200).send('Ignored');
        }
      } else {
        // Webhook agrégateur générique (Mobile Money / Mock)
        let payload = req.body;
        if (Buffer.isBuffer(payload)) {
          try { payload = JSON.parse(payload.toString()); } catch (e) { }
        }
        ({ provider, status, tenantId, amount, transactionId, planId } = payload || {});
      }

      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      // Always record the payment event (PENDING or SUCCESS). Activation only on SUCCESS.
      try {
        await Payment.create({
          tenantId,
          saleId: null,
          amount: amount || 0,
          method: provider || 'MOBILE_MONEY',
          reference: transactionId || `SUB-INITIAL-${Date.now()}`,
          status: status || 'PENDING',
          paymentDate: new Date()
        });
        console.log(`ℹ️ Subscription Payment event ${transactionId || 'N/A'} recorded for ${tenant.name} (status=${status})`);
      } catch (e) {
        console.error('[PAYMENT CREATE ERROR]', e);
      }

      if (status === 'SUCCESS') {
        // 1. Mise à jour de l'activation
        await tenant.update({ 
          isActive: true, 
          paymentStatus: 'UP_TO_DATE',
          lastPaymentDate: new Date()
        });

        const sub = await Subscription.findOne({ where: { tenantId } });
        if (sub) {
          const nextBilling = new Date();
          nextBilling.setMonth(nextBilling.getMonth() + 1);
          await sub.update({ 
            status: 'ACTIVE', 
            planId: planId || sub.planId,
            nextBillingDate: nextBilling 
          });
        }

        console.log(`✅ Initial Subscription Payment ${transactionId} confirmed for ${tenant.name}`);
      } else {
        // If PENDING, mark tenant/subscription as awaiting validation
        try {
          await tenant.update({ paymentStatus: 'PENDING' });
          const sub = await Subscription.findOne({ where: { tenantId } });
          if (sub) await sub.update({ status: 'PENDING' });
        } catch (e) {
          console.warn('[PENDING STATUS UPDATE FAILED]', e.message || e);
        }
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Payment webhook error', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}
