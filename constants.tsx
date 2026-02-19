
import { UserRole, User, StockItem, Invoice, AuditLog, Customer, SubscriptionPlan, Subscription, Tenant } from './types';

export const MOCK_TENANTS: Tenant[] = [
  { id: 'T1', name: 'TechCorp Solutions', domain: 'techcorp.gestock.pro', isActive: true, plan: 'ENTERPRISE', mrr: 250000, lastPaymentDate: '2023-10-25', paymentStatus: 'UP_TO_DATE', createdAt: '2023-01-01' },
  { id: 'T2', name: 'Global Logistics', domain: 'globallog.gestock.pro', isActive: true, plan: 'PRO', mrr: 85000, lastPaymentDate: '2023-10-20', paymentStatus: 'UP_TO_DATE', createdAt: '2023-05-15' },
  { id: 'T3', name: 'Impayé SARL', domain: 'impaye.gestock.pro', isActive: true, plan: 'BASIC', mrr: 30000, lastPaymentDate: '2023-09-15', paymentStatus: 'FAILED', createdAt: '2023-09-01' },
  { id: 'T-TRIAL', name: 'Nouveau Client', domain: 'test.gestock.pro', isActive: true, plan: 'FREE_TRIAL', mrr: 0, lastPaymentDate: '', paymentStatus: 'TRIAL', createdAt: new Date().toISOString() },
];

export const MOCK_USERS: User[] = [
  // Fix: Added missing 'isActive' property
  { id: '0', name: 'Super Admin', role: UserRole.SUPER_ADMIN, roles: [UserRole.SUPER_ADMIN], email: 'super@gestock.pro', mfaEnabled: true, lastLogin: '2023-10-27 12:00', activeSession: true, isActive: true, tenantId: 'SYSTEM' },
  // Fix: Added missing 'isActive' property
  { id: '1', name: 'Jean Admin', role: UserRole.ADMIN, roles: [UserRole.ADMIN], email: 'admin@gestock.pro', mfaEnabled: true, lastLogin: '2023-10-27 09:15', activeSession: true, isActive: true, tenantId: 'T1' },
  // Fix: Added missing 'isActive' property
  { id: '2', name: 'Marie Stock', role: UserRole.STOCK_MANAGER, roles: [UserRole.STOCK_MANAGER], email: 'marie@gestock.pro', mfaEnabled: true, lastLogin: '2023-10-27 08:30', activeSession: true, isActive: true, tenantId: 'T1' },
  // Fix: Added missing 'isActive' property
  { id: '4', name: 'Lucie Sales', role: UserRole.SALES, roles: [UserRole.SALES], email: 'lucie@gestock.pro', mfaEnabled: false, lastLogin: '2023-10-27 10:00', activeSession: true, isActive: true, tenantId: 'T1' },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { 
    id: 'FREE_TRIAL', 
    name: 'Essai Gratuit', 
    level: 0,
    price: 0, 
    features: ['14 jours complets', 'Quota: 1 Client, 5 Produits, 5 Ventes', '3 Catégories / 3 Sous-cat.'],
    maxUsers: 1,
    hasAiChatbot: true,
    hasStockForecast: true
  },
  { 
    id: 'BASIC', 
    name: 'Starter AI', 
    level: 1,
    price: 30000, 
    features: ['100 Factures/mois', '1 Utilisateur'],
    maxUsers: 1,
    hasAiChatbot: false,
    hasStockForecast: false
  },
  { 
    id: 'PRO', 
    name: 'Business Pro', 
    level: 2,
    price: 85000, 
    features: ['Illimité', '5 Utilisateurs'], 
    maxUsers: 5,
    hasAiChatbot: true,
    hasStockForecast: true,
    isPopular: true 
  },
  { 
    id: 'ENTERPRISE', 
    name: 'Enterprise Cloud', 
    level: 3,
    price: 250000, 
    features: ['Multi-Entités', '100 Utilisateurs'],
    maxUsers: 100,
    hasAiChatbot: true,
    hasStockForecast: true
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'C1', 
    companyName: 'TechCorp Solutions', 
    mainContact: 'Alice Martin', 
    email: 'contact@techcorp.com', 
    phone: '+33 1 23 45 67 89',
    billingAddress: '12 Rue de la Paix, 75001 Paris',
    siret: '12345678900012',
    tvaIntra: 'FR12123456789',
    outstandingBalance: 12450.50,
    paymentTerms: 30,
    healthStatus: 'GOOD'
  }
];

export const MOCK_STOCKS: StockItem[] = [
  { 
    id: 'S1', 
    sku: 'CPU-I9-14900K',
    name: 'Processeur Core i9', 
    category: 'Hardware', 
    currentLevel: 45, 
    minThreshold: 10, 
    forecastedLevel: 32, 
    unitPrice: 395000,
    location: 'Zone A - Rang 04',
    movements: [
      { id: 'M1', date: '2023-10-26', type: 'IN', qty: 50, reason: 'Réapprovisionnement fournisseur', user: 'Marie Stock' }
    ]
  }
];

export const MOCK_INVOICES: Invoice[] = [
  { 
    id: 'INV-2023-001', 
    customer: 'TechCorp Solutions', 
    customerId: 'C1', 
    date: '2023-10-25', 
    amount: 12450.50, 
    status: 'PAID', 
    type: 'FACTUR-X',
    taxAmount: 2490.10,
    transmissionStatus: 'SENT',
    items: [
      { productId: 'S1', name: 'Processeur Core i9', qty: 5, price: 395000, tva: 18 }
    ]
  }
];

export const MOCK_LOGS: AuditLog[] = [
  { id: 'L1', timestamp: '2023-10-27 10:45:12', userId: '1', userName: 'Jean Admin', action: 'ROLE_UPDATE', resource: 'User:Lucie Sales', status: 'SUCCESS', severity: 'MEDIUM' }
];

export const MOCK_SUBSCRIPTION: Subscription = {
  planId: 'PRO',
  status: 'ACTIVE',
  nextBillingDate: '25 Nov 2023',
  paymentHistory: [
    { id: 'PAY-2023-10-25', date: '25 Oct 2023', amount: 85000, method: 'STRIPE', status: 'SUCCESS' }
  ],
  autoRenew: true
};