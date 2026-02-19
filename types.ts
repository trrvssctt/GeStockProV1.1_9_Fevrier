
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STOCK_MANAGER = 'STOCK_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  SALES = 'SALES',
  EMPLOYEE = 'EMPLOYEE'
}

export type Currency = 'F CFA' | '€' | '$';
export type Language = 'Français' | 'English';

export type PaymentMethod = 'STRIPE' | 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'PAYPAL';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface AppSettings {
  language: Language;
  currency: string;
  platformLogo: string;
  invoiceLogo: string;
  companyName: string;
  siret?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface InventoryCampaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'VALIDATED';
  createdAt: string;
  items?: InventoryCampaignItem[];
}

export interface InventoryCampaignItem {
  id: string;
  stockItemId: string;
  stockItem?: StockItem;
  systemQty: number;
  countedQty: number;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  plan: 'FREE_TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  mrr: number;
  lastPaymentDate: string;
  paymentStatus: 'UP_TO_DATE' | 'LATE' | 'FAILED' | 'TRIAL' | 'PENDING';
  createdAt?: string; 
  // UI preferences
  primaryColor?: string;
  buttonColor?: string;
  fontFamily?: string;
  baseFontSize?: number;
  theme?: 'light' | 'dark' | string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  email: string;
  mfaEnabled: boolean;
  lastLogin: string;
  activeSession: boolean;
  isActive: boolean;
  tenantId: string;
  token?: string; 
  planId?: string; 
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  qty: number;
  reason: string;
  user: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentLevel: number;
  minThreshold: number;
  forecastedLevel: number;
  unitPrice: number;
  location: string;
  imageUrl?: string;
  subcategoryId?: string;
  movements?: StockMovement[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyName: string;
  mainContact: string;
  email: string;
  phone: string;
  billingAddress: string;
  siret?: string;
  tvaIntra?: string;
  outstandingBalance?: number;
  maxCreditLimit?: number;
  paymentTerms: number;
  healthStatus: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  tva: number;
}

export interface Invoice {
  id: string;
  customer: string;
  customerId: string;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT';
  type: string;
  taxAmount: number;
  transmissionStatus: string;
  items: InvoiceItem[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  status: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  level: number;
  price: number;
  features: string[];
  maxUsers: number;
  hasAiChatbot: boolean;
  hasStockForecast: boolean;
  isPopular?: boolean;
}

export interface SubscriptionPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: TransactionStatus;
}

export interface Subscription {
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'PENDING';
  nextBillingDate: string;
  paymentHistory: SubscriptionPayment[];
  autoRenew: boolean;
}
