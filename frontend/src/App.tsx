import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ensureCsrfCookie } from './lib/api';
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
        <div className="rounded-[2rem] border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-400">Feature Error</p>
          <h1 className="mt-3 text-2xl font-black text-slate-900">{this.props.featureName} could not load</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            The page hit a frontend error while rendering. Refresh the page first. If it keeps happening, share the message below and we can fix the exact failing branch.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-[1.4rem] border border-rose-100 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
            {this.state.errorMessage}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  React.useEffect(() => {
    void ensureCsrfCookie().catch(() => {
      // The app can still render if the backend is temporarily unavailable.
    });
  }, []);

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
          <Route index element={<DashboardHome />} />
          <Route path="bookings" element={<BookingTable />} />
          <Route path="bookings/new" element={<BookingForm />} />
          <Route path="bookings/:id" element={<BookingDetails />} />
          <Route path="bookings/:id/amend" element={<BookingAmendForm />} />
          <Route path="catalog" element={<CatalogOverview />} />
          <Route path="products" element={<ProductList />} />
          <Route path="excursions" element={<ExcursionList />} />
          <Route path="excursions/new" element={<ExcursionForm />} />
          <Route path="excursions/:id/edit" element={<ExcursionForm />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="schedules" element={<ScheduleList />} />
          <Route path="schedules/new" element={<ScheduleForm />} />
          <Route path="schedules/:id/edit" element={<ScheduleForm />} />
          <Route path="availability" element={<AvailabilityDashboard />} />
          <Route
            path="integrations"
            element={(
              <FeatureErrorBoundary featureName="Integrations">
                <IntegrationOpsDashboard />
              </FeatureErrorBoundary>
            )}
          />
          <Route path="reservations" element={<ReservationList />} />
          <Route path="reservations/new" element={<ReservationForm />} />
          <Route path="reservations/:id" element={<ReservationDetails />} />
          <Route path="finance/payments" element={<PaymentTable />} />
          <Route path="finance/payments/new" element={<PaymentForm />} />
          <Route path="finance/expenses" element={<ExpenseTable />} />
          <Route path="finance/expenses/new" element={<ExpenseForm />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="analytics/profitability" element={<ProfitabilityReport />} />
          <Route path="analytics/suppliers" element={<SupplierSpend />} />
          <Route path="analytics/outstanding" element={<OutstandingBalances />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/new" element={<ClientForm />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
