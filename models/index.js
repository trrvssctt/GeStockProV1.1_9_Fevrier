
import { Tenant } from './Tenant.js';
import { User } from './User.js';
import { StockItem } from './StockItem.js';
import { ProductMovement } from './ProductMovement.js';
import { Category } from './Category.js';
import { Subcategory } from './Subcategory.js';
import { Customer } from './Customer.js';
import { Invoice } from './Invoice.js';
import { InvoiceItem } from './InvoiceItem.js';
import { Document } from './Document.js';
import { Subscription } from './Subscription.js';
import { Plan } from './Plan.js';
import { AuditLog } from './AuditLog.js';
import { Backup } from './Backup.js';
import { Sale } from './Sale.js';
import { SaleItem } from './SaleItem.js';
import { Payment } from './Payment.js';
import { Administrator } from './Administrator.js';
import { Service } from './Service.js';
import { Message } from './Message.js';
import { PromptTemplate } from './PromptTemplate.js';

/**
 * ARCHITECTURE KERNEL V3.2.3
 * Mapping des relations via table Subscription (Bridge Logic)
 */

// --- RELATIONS SAAS (BRIDGING VIA SUBSCRIPTION) ---

// Un Tenant a une seule souscription active
Tenant.hasOne(Subscription, { foreignKey: 'tenant_id', as: 'subscription' });
Subscription.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Une Souscription est liée à un Plan
Subscription.belongsTo(Plan, { foreignKey: 'plan_id', as: 'planDetails' });
Plan.hasMany(Subscription, { foreignKey: 'plan_id' });

// --- RELATIONS ERP STANDARDS ---

Tenant.hasMany(User, { foreignKey: 'tenant_id' });
Tenant.hasMany(StockItem, { foreignKey: 'tenant_id' });
Tenant.hasMany(Customer, { foreignKey: 'tenant_id' });
Tenant.hasMany(Sale, { foreignKey: 'tenant_id' });
Tenant.hasMany(Payment, { foreignKey: 'tenant_id' });
Tenant.hasMany(Service, { foreignKey: 'tenant_id' });

User.belongsTo(Tenant, { foreignKey: 'tenant_id' });
StockItem.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Customer.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Sale.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Payment.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Service.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Ventes & Facturation
Sale.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Sale, { foreignKey: 'customer_id' });
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id' });

SaleItem.belongsTo(StockItem, { foreignKey: 'stock_item_id', as: 'stock_item' });
SaleItem.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

Sale.hasMany(Payment, { foreignKey: 'sale_id', as: 'payments' });
Payment.belongsTo(Sale, { foreignKey: 'sale_id' });

// Stocks & Catégories
StockItem.hasMany(ProductMovement, { foreignKey: 'stock_item_id' });
ProductMovement.belongsTo(StockItem, { foreignKey: 'stock_item_id' });

Category.hasMany(Subcategory, { foreignKey: 'category_id' });
Subcategory.belongsTo(Category, { foreignKey: 'category_id' });
Subcategory.hasMany(StockItem, { foreignKey: 'subcategory_id' });
StockItem.belongsTo(Subcategory, { foreignKey: 'subcategory_id' });

export { 
  Tenant, User, StockItem, ProductMovement, 
  Customer, Invoice, InvoiceItem, Subscription, 
  Plan, AuditLog, Backup, Document, Category, Subcategory,
  Sale, SaleItem, Payment, Administrator, Service,
  Message, PromptTemplate
};
