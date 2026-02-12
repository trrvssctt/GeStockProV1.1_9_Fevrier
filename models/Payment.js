
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Payment extends Model {}

Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  // Autoriser la nullité pour les paiements hors-ventes (abonnements)
  saleId: { type: DataTypes.UUID, allowNull: true, field: 'sale_id' },
  amount: { type: DataTypes.NUMERIC(15, 2), allowNull: false },
  method: { 
    type: DataTypes.ENUM('CASH', 'ORANGE_MONEY', 'WAVE', 'MTN_MOMO', 'STRIPE', 'TRANSFER'), 
    allowNull: false 
  },
  reference: { type: DataTypes.STRING(100) }, // ID transaction mobile ou bank
  status: { type: DataTypes.STRING(20), defaultValue: 'PENDING', field: 'statut' },
  paymentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'payment_date' }
}, { 
  sequelize, 
  modelName: 'payment',
  tableName: 'payments',
  underscored: true 
});
