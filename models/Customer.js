import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Customer extends Model {}

Customer.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  companyName: { type: DataTypes.STRING, allowNull: true, field: 'company_name' },
  mainContact: { type: DataTypes.STRING, field: 'main_contact' },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  billingAddress: { type: DataTypes.TEXT, field: 'billing_address' },
  siret: { type: DataTypes.STRING },
  tvaIntra: { type: DataTypes.STRING, field: 'tva_intra' },
  
  // Paramètres financiers
  outstandingBalance: { type: DataTypes.FLOAT, defaultValue: 0, field: 'outstanding_balance' },
  maxCreditLimit: { type: DataTypes.FLOAT, defaultValue: 5000, field: 'max_credit_limit' },
  paymentTerms: { type: DataTypes.INTEGER, defaultValue: 30, field: 'payment_terms' },
  
  // Statuts
  healthStatus: { 
    type: DataTypes.ENUM('GOOD', 'WARNING', 'CRITICAL'), 
    defaultValue: 'GOOD',
    field: 'health_status'
  },
  status: { 
    type: DataTypes.STRING(20), 
    defaultValue: 'actif',
    allowNull: false 
  },
  deletedAt: { 
    type: DataTypes.DATE, 
    field: 'deleted_at' 
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, { 
  sequelize, 
  modelName: 'customer',
  tableName: 'customers',
  underscored: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'email'], where: { status: 'actif' } },
    { unique: true, fields: ['tenant_id', 'company_name'], where: { status: 'actif' } }
  ]
});

export default Customer;