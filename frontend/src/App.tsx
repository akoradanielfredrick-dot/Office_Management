import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import type { PortalModuleKey } from './lib/portalAccess';
import { HOME_MODULE_ORDER, PORTAL_MODULES } from './lib/portalAccess';
import { api, ensureCsrfCookie } from './lib/api';
import { LoginForm } from './features/auth/LoginForm';
import { Dashboard } from './features/dashboard/Dashboard';
import { DashboardHome } from './features/dashboard/DashboardHome';
import { BookingTable } from './features/operations/BookingTable';
import { BookingDetails } from './features/operations/BookingDetails';
import { PaymentTable } from './features/finance/PaymentTable';
import { PaymentForm } from './features/finance/PaymentForm';
import { ExpenseTable } from './features/finance/ExpenseTable';
import { ExpenseForm } from './features/finance/ExpenseForm';
import { AnalyticsDashboard } from './features/analytics/AnalyticsDashboard';
import { ProfitabilityReport } from './features/analytics/ProfitabilityReport';
import { SupplierSpend } from './features/analytics/SupplierSpend';
import { OutstandingBalances } from './features/analytics/OutstandingBalances';
import { ClientList } from './features/clients/ClientList';
import { ClientForm } from './features/clients/ClientForm';
import { BookingForm } from './features/operations/BookingForm';
import { ProductList } from './features/operations/ProductList';
import { ProductForm } from './features/operations/ProductForm';
import { CatalogOverview } from './features/operations/CatalogOverview';
import { ExcursionList } from './features/operations/ExcursionList';
import { ExcursionForm } from './features/operations/ExcursionForm';
import { ScheduleList } from './features/operations/ScheduleList';
import { ScheduleForm } from './features/operations/ScheduleForm';
import { AvailabilityDashboard } from './features/operations/AvailabilityDashboard';
import { IntegrationOpsDashboard } from './features/operations/IntegrationOpsDashboard';
import { ReservationList } from './features/operations/ReservationList';
import { ReservationForm } from './features/operations/ReservationForm';
import { ReservationDetails } from './features/operations/ReservationDetails';
import { BookingAmendForm } from './features/operations/BookingAmendForm';

type FeatureErrorBoundaryProps = {
  children: React.ReactNode;
  featureName: string;
};

type FeatureErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

class FeatureErrorBoundary extends React.Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Unhandled error while rendering ${this.props.featureName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="brand-panel p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-500">Feature Error</p>
          <h1 className="mt-3 text-2xl font-black text-[var(--color-text-primary)]">{this.props.featureName} could not load</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
            The page hit a frontend error while rendering. Refresh the page first. If it keeps happening, share the message below and we can fix the exact failing branch.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-[1.4rem] border border-rose-200 bg-[var(--color-danger-soft)] px-4 py-4 text-sm font-semibold text-rose-700">
            {this.state.errorMessage}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const hasModuleAccess = (user: ReturnType<typeof useAuthStore.getState>['user'], moduleKey: PortalModuleKey): boolean => {
  if (!user) {
    return false;
  }

  if (user.is_management) {
    return true;
  }

  return user.portal_permissions.includes(`${moduleKey}.view`);
};

const getAccessibleModulePaths = (user: ReturnType<typeof useAuthStore.getState>['user']): string[] => {
  if (!user) {
    return [];
  }

  const keys = user.is_management
    ? HOME_MODULE_ORDER
    : HOME_MODULE_ORDER.filter((moduleKey) => hasModuleAccess(user, moduleKey));

  return keys
    .map((moduleKey) => PORTAL_MODULES.find((module) => module.key === moduleKey)?.path || null)
    .filter((path): path is string => Boolean(path));
};

const AccessWelcome: React.FC = () => (
  <div className="brand-panel bg-[linear-gradient(135deg,var(--color-surface)_0%,var(--color-surface-soft)_100%)] p-8">
    <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Mranga Portal Access</p>
    <h1 className="mt-3 text-2xl font-black text-[var(--color-primary-strong)]">Welcome to the portal</h1>
    <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
      You currently do not have any modules assigned. Please contact your administrator for access.
    </p>
  </div>
);

const PortalLanding: React.FC = () => {
  const { user } = useAuthStore();
  const accessiblePaths = React.useMemo(() => getAccessibleModulePaths(user), [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!accessiblePaths.length) {
    return <AccessWelcome />;
  }

  if (hasModuleAccess(user, 'dashboard')) {
    return <DashboardHome />;
  }

  return <Navigate to={accessiblePaths[0]} replace />;
};

const ModuleRoute: React.FC<{ module: PortalModuleKey; element: React.ReactElement }> = ({ module, element }) => {
  const { user } = useAuthStore();
  const accessiblePaths = React.useMemo(() => getAccessibleModulePaths(user), [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasModuleAccess(user, module)) {
    return element;
  }

  if (!accessiblePaths.length) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={accessiblePaths[0]} replace />;
};

const App: React.FC = () => {
  const { isAuthenticated, syncUser, logout } = useAuthStore();

  React.useEffect(() => {
    void ensureCsrfCookie().catch(() => {
      // The app can still render if the backend is temporarily unavailable.
    });
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    const syncSession = async () => {
      try {
        const response = await api.get('/auth/me/');
        if (!cancelled) {
          syncUser(response.data.user);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      }
    };

    void syncSession();
    const interval = window.setInterval(() => {
      void syncSession();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, logout, syncUser]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? (
            <LoginForm />
          ) : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        >
          <Route index element={<PortalLanding />} />
          <Route path="bookings" element={<ModuleRoute module="bookings" element={<BookingTable />} />} />
          <Route path="bookings/new" element={<ModuleRoute module="bookings" element={<BookingForm />} />} />
          <Route path="bookings/:id" element={<ModuleRoute module="bookings" element={<BookingDetails />} />} />
          <Route path="bookings/:id/amend" element={<ModuleRoute module="bookings" element={<BookingAmendForm />} />} />
          <Route path="catalog" element={<ModuleRoute module="catalog" element={<CatalogOverview />} />} />
          <Route path="products" element={<ModuleRoute module="products" element={<ProductList />} />} />
          <Route path="excursions" element={<ModuleRoute module="excursions" element={<ExcursionList />} />} />
          <Route path="excursions/new" element={<ModuleRoute module="excursions" element={<ExcursionForm />} />} />
          <Route path="excursions/:id/edit" element={<ModuleRoute module="excursions" element={<ExcursionForm />} />} />
          <Route path="products/new" element={<ModuleRoute module="products" element={<ProductForm />} />} />
          <Route path="products/:id/edit" element={<ModuleRoute module="products" element={<ProductForm />} />} />
          <Route path="schedules" element={<ModuleRoute module="schedules" element={<ScheduleList />} />} />
          <Route path="schedules/new" element={<ModuleRoute module="schedules" element={<ScheduleForm />} />} />
          <Route path="schedules/:id/edit" element={<ModuleRoute module="schedules" element={<ScheduleForm />} />} />
          <Route path="availability" element={<ModuleRoute module="availability" element={<AvailabilityDashboard />} />} />
          <Route
            path="integrations"
            element={
              <ModuleRoute
                module="integrations"
                element={(
                  <FeatureErrorBoundary featureName="Integrations">
                    <IntegrationOpsDashboard />
                  </FeatureErrorBoundary>
                )}
              />
            }
          />
          <Route path="reservations" element={<ModuleRoute module="reservations" element={<ReservationList />} />} />
          <Route path="reservations/new" element={<ModuleRoute module="reservations" element={<ReservationForm />} />} />
          <Route path="reservations/:id" element={<ModuleRoute module="reservations" element={<ReservationDetails />} />} />
          <Route path="finance/payments" element={<ModuleRoute module="payments" element={<PaymentTable />} />} />
          <Route path="finance/payments/new" element={<ModuleRoute module="payments" element={<PaymentForm />} />} />
          <Route path="finance/expenses" element={<ModuleRoute module="expenses" element={<ExpenseTable />} />} />
          <Route path="finance/expenses/new" element={<ModuleRoute module="expenses" element={<ExpenseForm />} />} />
          <Route path="analytics" element={<ModuleRoute module="analytics" element={<AnalyticsDashboard />} />} />
          <Route path="analytics/profitability" element={<ModuleRoute module="analytics" element={<ProfitabilityReport />} />} />
          <Route path="analytics/suppliers" element={<ModuleRoute module="analytics" element={<SupplierSpend />} />} />
          <Route path="analytics/outstanding" element={<ModuleRoute module="analytics" element={<OutstandingBalances />} />} />
          <Route path="clients" element={<ModuleRoute module="clients" element={<ClientList />} />} />
          <Route path="clients/new" element={<ModuleRoute module="clients" element={<ClientForm />} />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
