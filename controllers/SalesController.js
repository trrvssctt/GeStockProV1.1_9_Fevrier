
import { Sale, SaleItem, Payment, StockItem, ProductMovement, Customer, AuditLog, Service, Invoice, InvoiceItem } from '../models/index.js';
import { InvoiceService } from '../services/InvoiceService.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';



async function checkActiveInventory(tenantId) {
  const [active] = await sequelize.query(
    'SELECT name FROM inventory_campaigns WHERE tenant_id = :tenantId AND status = \'DRAFT\' LIMIT 1',
    { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
  );
  if (active) throw new Error(`Action bloquée : Un inventaire physique ("${active.name}") est actuellement en cours.`);
}

export class SaleController {

  
  static async list(req, res) {
    try {
      const sales = await Sale.findAll({
        where: { tenantId: req.user.tenantId },
        include: [
          { model: Customer, attributes: ['companyName', 'email', 'phone', 'billingAddress'] },
          { 
            model: SaleItem, 
            as: 'items',
            include: [
              { model: StockItem, as: 'stock_item', attributes: ['name', 'sku'] },
              { model: Service, as: 'service', attributes: ['name'] }
            ] 
          },
          { model: Payment, as: 'payments' }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.status(200).json(sales);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { customerId, items, amountPaid, paymentMethod } = req.body;
      const result = await InvoiceService.validateAndGenerate(req.user.tenantId, customerId, items, req.user.id, req.user.name);
      
      if (amountPaid > 0) {
        await Payment.create({
          tenantId: req.user.tenantId,
          saleId: result.sale.id,
          amount: amountPaid,
          method: paymentMethod || 'CASH',
          reference: 'ACOMPTE_INITIAL'
        });
        await result.sale.update({ amountPaid: amountPaid });
      }
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: 'CreateError', message: error.message });
    }
  }

  static async updateSale(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { customerId, items } = req.body;
      const tenantId = req.user.tenantId;

      const sale = await Sale.findByPk(id, { include: [{ model: SaleItem, as: 'items' }], transaction });
      if (!sale) throw new Error("Vente introuvable.");
      
      if (parseFloat(sale.amountPaid) > 0) throw new Error("Modification interdite : des règlements sont déjà enregistrés.");
      const hasDeliveries = sale.items.some(i => parseInt(i.quantityDelivered || i.quantity_delivered || 0) > 0);
      if (hasDeliveries) throw new Error("Modification interdite : certains articles ont déjà été livrés.");

      await SaleItem.destroy({ where: { saleId: id }, transaction });
      const invoice = await Invoice.findOne({ where: { saleId: id, tenantId }, transaction });
      if (invoice) {
        await InvoiceItem.destroy({ where: { invoiceId: invoice.id }, transaction });
      }

      let newTotalHt = 0;
      for (const item of items) {
        const itemHt = item.price * item.quantity;
        newTotalHt += itemHt;

        await SaleItem.create({
          saleId: id, 
          stockItemId: item.type === 'PRODUCT' ? item.productId : null,
          serviceId: item.type === 'SERVICE' ? item.productId : null,
          quantity: item.quantity, quantityDelivered: 0, unitPrice: item.price,
          totalTtc: itemHt * 1.18, taxRate: 18
        }, { transaction });

        if (invoice) {
          await InvoiceItem.create({
            invoiceId: invoice.id, productId: item.type === 'PRODUCT' ? item.productId : null,
            name: item.name, qty: item.quantity, price: item.price, tva: 18
          }, { transaction });
        }
        // Pas de mouvement de stock ici non plus.
      }

      const ttc = newTotalHt * 1.18;
      await sale.update({ 
        customerId: customerId || null, 
        totalHt: newTotalHt, 
        totalTtc: ttc, 
        taxAmount: ttc - newTotalHt 
      }, { transaction });

      if (invoice) {
        await invoice.update({ 
          customerId: customerId || null, 
          amount: newTotalHt, 
          taxAmount: ttc - newTotalHt 
        }, { transaction });
      }

      await transaction.commit();
      return res.status(200).json({ message: "Transaction mise à jour." });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return res.status(400).json({ error: 'UpdateError', message: error.message });
    }
  }

  static async cancelSale(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { reason, returnToStockMap } = req.body; 

      const sale = await Sale.findByPk(id, { include: [{ model: SaleItem, as: 'items' }], transaction });
      if (!sale) return res.status(404).json({ error: 'Sale not found' });
      
      // Restauration uniquement pour ce qui a ÉTÉ livré physiquement
      for (const item of sale.items) {
        const delivered = parseInt(item.quantityDelivered || item.quantity_delivered || 0);
        const qtyToReturn = Math.min(delivered, returnToStockMap?.[item.id] || 0);
        const sId = item.stockItemId || item.stock_item_id;
        
        if (qtyToReturn > 0 && sId) {
          const product = await StockItem.findByPk(sId, { transaction });
          if (product) {
            const prev = product.currentLevel;
            await product.increment('currentLevel', { by: qtyToReturn, transaction });
            await ProductMovement.create({
              tenantId: req.user.tenantId, stockItemId: sId, type: 'IN', qty: qtyToReturn,
              reason: `Annulation Livraison Vente ${sale.reference}`, previousLevel: prev, newLevel: prev + qtyToReturn,
              userRef: req.user.name, referenceId: sale.reference
            }, { transaction });
          }
        }
      }

      const totalPaid = parseFloat(sale.amountPaid || 0);
      if (totalPaid > 0) {
        await Payment.create({
          tenantId: req.user.tenantId,
          saleId: id,
          amount: -totalPaid,
          method: 'CASH',
          reference: `ANNULATION_${sale.reference}`,
          paymentDate: new Date()
        }, { transaction });
      }

      await sale.update({ status: 'ANNULE', amountPaid: 0 }, { transaction });
      await Invoice.update({ status: 'CANCELLED' }, { where: { saleId: id, tenantId: req.user.tenantId }, transaction });

      await transaction.commit();
      return res.status(200).json({ message: 'Vente annulée.' });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return res.status(500).json({ error: 'CancelError', message: error.message });
    }
  }

  static async addPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, method, reference } = req.body;
      const sale = await Sale.findByPk(id);
      if (!sale) return res.status(404).json({ error: 'Sale not found' });

      await Payment.create({
        tenantId: req.user.tenantId,
        saleId: id,
        amount,
        method,
        reference
      });

      const newPaid = parseFloat(sale.amountPaid) + parseFloat(amount);
      const newStatus = newPaid >= parseFloat(sale.totalTtc) ? 'TERMINE' : 'EN_COURS';
      
      await sale.update({ amountPaid: newPaid, status: newStatus });

      return res.status(200).json({ message: 'Paiement enregistré.' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async recordDelivery(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { items } = req.body; 
      const tenantId = req.user.tenantId;

      const sale = await Sale.findByPk(id, { transaction });
      if (!sale) throw new Error("Vente non trouvée");

      for (const deliveryLine of items) {
        const saleItem = await SaleItem.findByPk(deliveryLine.itemId, { transaction });
        if (saleItem && saleItem.stockItemId) {
          const product = await StockItem.findOne({ where: { id: saleItem.stockItemId, tenantId }, transaction });
          
          if (!product || product.currentLevel < deliveryLine.qtyToDeliver) {
            throw new Error(`Stock physique insuffisant pour ${product?.name || 'article'}.`);
          }

          const currentDel = parseInt(saleItem.quantityDelivered || saleItem.quantity_delivered || 0);
          const updatedDelQty = currentDel + parseInt(deliveryLine.qtyToDeliver);
          
          const prevStock = product.currentLevel;
          await product.decrement('currentLevel', { by: deliveryLine.qtyToDeliver, transaction });
          await saleItem.update({ quantityDelivered: updatedDelQty }, { transaction });

          await ProductMovement.create({
            tenantId,
            stockItemId: saleItem.stockItemId,
            type: 'OUT',
            qty: deliveryLine.qtyToDeliver,
            reason: `Livraison Vente ${sale.reference}`,
            previousLevel: prevStock,
            newLevel: prevStock - deliveryLine.qtyToDeliver,
            userRef: req.user.name,
            referenceId: sale.reference
          }, { transaction });
        }
      }

      await transaction.commit();
      return res.status(200).json({ message: 'Livraison scellée et stock décrémenté.' });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return res.status(400).json({ error: 'DeliveryError', message: error.message });
    }
  }
}
