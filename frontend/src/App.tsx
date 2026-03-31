import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ensureCsrfCookie } from './lib/api';
import { LoginForm } from './features/auth/LoginForm';
import { Dashboard } from './features/dashboard/Dashboard';
import { DashboardHome } from './features/dashboard/DashboardHome';
import { QuotationTable } from './features/sales/QuotationTable';
import { QuotationForm } from './features/sales/QuotationForm';
import { QuotationDetails } from './features/sales/QuotationDetails';
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
          <Route path="quotations" element={<QuotationTable />} />
          <Route path="quotations/new" element={<QuotationForm />} />
          <Route path="quotations/:id" element={<QuotationDetails />} />
          <Route path="bookings" element={<BookingTable />} />
          <Route path="bookings/:id" element={<BookingDetails />} />
          <Route path="finance/payments" element={<PaymentTable />} />
          <Route path="finance/payments/new" element={<PaymentForm />} />
          <Route path="finance/expenses" element={<ExpenseTable />} />
          <Route path="finance/expenses/new" element={<ExpenseForm />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="analytics/profitability" element={<ProfitabilityReport />} />
          <Route path="analytics/suppliers" element={<SupplierSpend />} />
          <Route path="analytics/outstanding" element={<OutstandingBalances />} />
          <Route path="clients" element={<ClientList />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
