
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Tenant extends Model {}

Tenant.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  domain: { type: DataTypes.STRING, unique: true, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  
  // Fiscalité & Localisation
  siret: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  currency: { type: DataTypes.STRING, defaultValue: 'F CFA' },
  timezone: { type: DataTypes.STRING, defaultValue: 'UTC' },
  language: { type: DataTypes.STRING, defaultValue: 'fr' },
  taxRate: { type: DataTypes.NUMERIC(5, 2), defaultValue: 18.00, field: 'tax_rate' },
  
  // Branding & UI
  logoUrl: { type: DataTypes.TEXT, field: 'logo_url' },
  primaryColor: { type: DataTypes.STRING(7), defaultValue: '#4f46e5', field: 'primary_color' },
    cachetUrl: { type: DataTypes.TEXT, field: 'cachet_url' }, // Nouveau
  
  // Paramètres Facturation
  invoicePrefix: { type: DataTypes.STRING(20), defaultValue: 'INV-', field: 'invoice_prefix' },
  invoiceFooter: { type: DataTypes.TEXT, field: 'invoice_footer' },
  
  // Sécurité Instance
  enforceMfa: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'enforce_mfa' },
  onboardingCompleted: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'onboarding_completed' },
  
  // Business Stats
  mrr: { type: DataTypes.NUMERIC(15, 2), defaultValue: 0 },
  paymentStatus: { type: DataTypes.STRING(20), defaultValue: 'PENDING', field: 'payment_status' },
  lastPaymentDate: { type: DataTypes.DATE, field: 'last_payment_date' }
}, { 
  sequelize, 
  modelName: 'tenant',
  tableName: 'tenants',
  underscored: true 
});
