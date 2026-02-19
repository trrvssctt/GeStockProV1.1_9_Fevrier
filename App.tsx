
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import Layout from './components/Layout';
import ToastProvider from './components/ToastProvider';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import InventoryCampaign from './components/InventoryCampaign';
import StockMovements from './components/StockMovements';
import CategoryManager from './components/CategoryManager';
import SubcategoryManager from './components/SubcategoryManager';
import Customers from './components/Customers';
import Sales from './components/Sales';
import Recovery from './components/Recovery';
import Payments from './components/Payments';
import Services from './components/Services';
import SecurityPanel from './components/SecurityPanel';
import AuditLogs from './components/AuditLogs';
import Settings from './components/Settings';
import Subscription from './components/Subscription';
import ChatInterface from './components/ChatInterface';
import SuperAdmin from './components/SuperAdmin';
import SuperAdminLogin from './components/SuperAdminLogin';
import Governance from './components/Governance';
import Login from './components/Login';
import RegistrationSuccess from './components/RegistrationSuccess';
import Checkout from './components/Checkout';
import OnboardingWizard from './components/OnboardingWizard';
import AIAnalysis from './components/AIAnalysis';
import { MOCK_USERS, MOCK_TENANTS, SUBSCRIPTION_PLANS } from './constants';
import { UserRole, AppSettings, User, Tenant, SubscriptionPlan } from './types';
import { authBridge } from './services/authBridge';
import { apiClient } from './services/api';
import { AlertCircle, ShieldAlert, RefreshCw, Terminal, History, Lock, Zap, CreditCard, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * Module 10: Error Boundary for SaaS Resilience
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[KERNEL PANIC] Module 10 Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
          <div className="max-w-xl w-full bg-white rounded-[4rem] p-16 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg border border-rose-100 animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-4">Kernel Panic</h1>
            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em] leading-relaxed mb-10">
              Une erreur critique a été interceptée. Votre session est isolée pour protéger l'intégrité du tenant.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <RefreshCw size={18} /> RÉINITIALISER L'INSTANCE
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [navigationMetadata, setNavigationMetadata] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // États de flux post-inscription
  const [showRegSuccess, setShowRegSuccess] = useState<{ mustPay: boolean, planId: string, user: User, planObj?: SubscriptionPlan } | null>(null);
  const [showCheckout, setShowCheckout] = useState<{ planId: string, user: User, planObj?: SubscriptionPlan } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<{ companyName: string, user: User, mustPay: boolean, planId: string, planObj?: SubscriptionPlan } | null>(null);
  const [activationPending, setActivationPending] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    language: 'Français',
    currency: 'F CFA',
    platformLogo: '',
    invoiceLogo: '',
    companyName: 'GeStockPro Cloud'
  });

  useEffect(() => {
    const primaryColor = (appSettings as any).primaryColor || '#4f46e5';
    document.documentElement.style.setProperty('--primary-kernel', primaryColor);
  }, [appSettings]);

  const syncTenantSettings = async (user: User) => {
    try {
      const settings = await apiClient.get('/settings');
      if (settings) {
        setAppSettings({
          language: settings.language === 'en' ? 'English' : 'Français',
          currency: settings.currency || 'F CFA',
          platformLogo: settings.logoUrl || '',
          invoiceLogo: settings.logoUrl || '',
          companyName: settings.name || 'Ma Société',
          ...settings 
        });
        // Apply visual preferences globally so entire app reflects tenant settings
        try {
          if (settings.primaryColor) {
            document.documentElement.style.setProperty('--primary-kernel', settings.primaryColor);
          }
          if (settings.buttonColor || settings.button_color) {
            document.documentElement.style.setProperty('--button-kernel', settings.buttonColor || settings.button_color);
          }
          if (settings.fontFamily) {
            document.documentElement.style.setProperty('--kernel-font-family', settings.fontFamily);
            document.documentElement.style.fontFamily = settings.fontFamily;
          }
          if (settings.baseFontSize) {
            document.documentElement.style.setProperty('--base-font-size', `${settings.baseFontSize}px`);
            document.documentElement.style.fontSize = `${settings.baseFontSize}px`;
          }
          const themeVal = settings.theme ?? settings.is_dark ?? 'light';
          const isDark = themeVal === 'dark' || themeVal === true;
          document.documentElement.classList.toggle('dark', Boolean(isDark));
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } catch (e) {
          // ignore apply errors
        }
      }
    } catch (e) {
      console.warn("Settings Sync failed");
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const session = authBridge.getSession();
      if (session) {
        const freshUser = await authBridge.fetchMe(session.token);
        if (freshUser && freshUser.isActive) {
          // Ensure planId is present: derive from tenant if backend didn't include it
          const tenantFromMock = MOCK_TENANTS.find(t => t.id === freshUser.tenantId);
          if (!freshUser.planId && tenantFromMock) {
            (freshUser as any).planId = tenantFromMock.plan;
          }
          setCurrentUser(freshUser);
          setIsLoggedIn(true);
          await syncTenantSettings(freshUser);
          if (freshUser.role === UserRole.SUPER_ADMIN) setActiveTab('superadmin');
        } else {
          authBridge.clearSession();
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  const handleLoginSuccess = async (user: User) => {
    const registerMeta = user as any;
    // Only treat as a freshly-registered flow when backend/registration set explicit flags
    if ((registerMeta.mustPay === true || registerMeta.selectedPlanDetails) && !registerMeta.onboardingCompleted) {
      setShowRegSuccess({ 
        mustPay: registerMeta.mustPay === true, 
        planId: registerMeta.planId, 
        user: user,
        planObj: registerMeta.selectedPlanDetails 
      });
      return;
    }
    
    // Ensure planId is set from tenant if not present
    const tenantFromMock = MOCK_TENANTS.find(t => t.id === user.tenantId);
    if (!user.planId && tenantFromMock) {
      (user as any).planId = tenantFromMock.plan;
    }
    setCurrentUser(user);
    setIsLoggedIn(true);
    await syncTenantSettings(user);
    setActiveTab(user.role === UserRole.SUPER_ADMIN ? 'superadmin' : 'dashboard');
  };

  const resetToLogin = () => {
    authBridge.clearSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowRegSuccess(null);
    setShowCheckout(null);
    setShowOnboarding(null);
    setActivationPending(false);
    setNavigationMetadata(null);
  };

  const handleLogout = () => {
    resetToLogin();
    setActiveTab('dashboard');
  };

  const handleContextualNavigate = (tab: string, meta?: any) => {
    if (currentUser && authBridge.canAccess(currentUser, tab)) {
      setNavigationMetadata(meta);
      setActiveTab(tab);
    }
  };

  const currentTenant = MOCK_TENANTS.find(t => t.id === currentUser?.tenantId);
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === (currentUser?.planId || currentTenant?.plan));
  
  if (isInitializing) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initialisation du Kernel...</p>
      </div>
    );
  }

  if (showRegSuccess) {
    const plan = showRegSuccess.planObj || SUBSCRIPTION_PLANS.find(p => p.id === showRegSuccess.planId);
    return <RegistrationSuccess mustPay={showRegSuccess.mustPay} onContinue={() => {
      setShowOnboarding({ 
        companyName: showRegSuccess?.user.name.replace('Admin ', '') || 'Ma Société', 
        user: showRegSuccess!.user,
        mustPay: showRegSuccess!.mustPay,
        planId: showRegSuccess!.planId,
        planObj: showRegSuccess!.planObj
      });
      setShowRegSuccess(null);
    }} planName={plan?.name || 'Plan Initial'} />;
  }

  if (showOnboarding) return <OnboardingWizard companyName={showOnboarding.companyName} user={showOnboarding.user} onComplete={async (data) => {
    if (showOnboarding?.mustPay) {
      setShowCheckout({ 
        planId: showOnboarding.planId, 
        user: showOnboarding.user, 
        planObj: showOnboarding.planObj 
      });
      setShowOnboarding(null);
    } else {
      setCurrentUser(showOnboarding.user);
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      setShowOnboarding(null);
    }
  }} />;

  if (showCheckout) return <Checkout 
    planId={showCheckout.planId} 
    user={showCheckout.user}
    planObj={showCheckout.planObj} 
    onSuccess={() => {
      setActivationPending(true);
      setShowCheckout(null);
    }} 
    onCancel={() => resetToLogin()} 
  />;

  if (activationPending) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full animate-in zoom-in-95 duration-700 space-y-10">
          <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Paiement Reçu !</h1>
            <p className="text-slate-400 font-medium leading-relaxed uppercase text-[10px] tracking-[0.3em] px-8">
              Votre dossier a été transmis au Kernel pour activation. Vous pourrez vous connecter dès validation définitive de votre flux.
            </p>
          </div>
          <button 
            onClick={() => resetToLogin()}
            className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            RETOURNER À LA CONNEXION <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Direct access to Super-Admin login via /superadmin
  if (!isLoggedIn) {
    if (typeof window !== 'undefined' && window.location.pathname === '/superadmin') {
      return <SuperAdminLogin onLoginSuccess={handleLoginSuccess} />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    if (!currentUser) return null;
    
    if (!authBridge.canAccess(currentUser, activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 border border-rose-100 shadow-inner">
            <Lock size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Isolation Active</h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em] max-w-sm">
            Vos privilèges ne permettent pas d'accéder au module <span className="text-rose-500 font-black">{activeTab}</span>.
          </p>
          <button onClick={() => setActiveTab('dashboard')} className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Retour</button>
        </div>
      );
    }

    switch (activeTab) {
      case 'superadmin': return <SuperAdmin />;
      case 'dashboard': return <Dashboard user={currentUser} currency={appSettings.currency} onNavigate={handleContextualNavigate} />;
      case 'ai_analysis': return <AIAnalysis user={currentUser} />;
      case 'categories': return <CategoryManager plan={currentPlan} />;
      case 'subcategories': return <SubcategoryManager plan={currentPlan} />;
      case 'inventory': return <Inventory currency={appSettings.currency} userRole={currentUser.role} plan={currentPlan} />;
      case 'audit_inventory': return <InventoryCampaign settings={appSettings} />;
      case 'inventorycampaigns': return <InventoryCampaign settings={appSettings} />;
      case 'movements': return <StockMovements currency={appSettings.currency} tenantSettings={appSettings} />;
      case 'customers': return <Customers user={currentUser} currency={appSettings.currency} plan={currentPlan} />;
      case 'sales': return <Sales currency={appSettings.currency} user={currentUser} tenantSettings={appSettings} plan={currentPlan} />;
      case 'services': return <Services currency={appSettings.currency} />;
      case 'recovery': return <Recovery currency={appSettings.currency} />;
      case 'payments': return <Payments currency={appSettings.currency} tenantSettings={appSettings} />;
      case 'governance': return <Governance tenantId={currentUser.tenantId} plan={currentPlan} />;
      case 'subscription': return <Subscription user={currentUser} currency={appSettings.currency} />;
      case 'security': return <SecurityPanel />;
      case 'audit': return <AuditLogs tenantSettings={appSettings} />;
      case 'settings': return <Settings settings={appSettings} onSave={setAppSettings} />;
      default: return <Dashboard user={currentUser} currency={appSettings.currency} onNavigate={handleContextualNavigate} />;
    }
  };

  return (
    <ErrorBoundary children={
      <ToastProvider>
        <div className={`min-h-screen ${activeTab === 'superadmin' ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <Layout 
            user={currentUser!} 
            activeTab={activeTab} 
            setActiveTab={(tab) => {
              setNavigationMetadata(null); 
              setActiveTab(tab);
            }} 
            onLogout={handleLogout}
            isSuperAdminMode={activeTab === 'superadmin'}
            logoUrl={appSettings.platformLogo}
            companyName={appSettings.companyName}
          >
            {renderContent()}
          </Layout>
          {activeTab !== 'superadmin' && activeTab !== 'ai_analysis' && currentPlan?.hasAiChatbot && <ChatInterface user={currentUser!} />}
        </div>
      </ToastProvider>
    } />
  );
};

export default App;
