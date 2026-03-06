import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import PoliciesPage from './pages/PoliciesPage';
import LeadsPage from './pages/LeadsPage';
import DocumentsPage from './pages/DocumentsPage';
import ReportsPage from './pages/ReportsPage';
import EmployeesPage from './pages/EmployeesPage';
import SettingsPage from './pages/SettingsPage';
import ClientAddPage from './pages/ClientAddPage';
import ClientProfilePage from './pages/ClientProfilePage';
import PolicyAddPage from './pages/PolicyAddPage';
import PolicyDetailPage from './pages/PolicyDetailPage';
import RenewalsPage from './pages/RenewalsPage';
import ReferencesPage from './pages/ReferencesPage';
import CommissionsPage from './pages/CommissionsPage';
import ReferralsDashboard from './pages/ReferralsDashboard';
import MonthlyReportsPage from './pages/MonthlyReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';

// Configure Axios Defaults global
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5005';
axios.defaults.headers.common['Content-Type'] = 'application/json';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/new" element={<ClientAddPage />} />
              <Route path="clients/:id" element={<ClientProfilePage />} />
              <Route path="policies" element={<PoliciesPage />} />
              <Route path="policies/new" element={<PolicyAddPage />} />
              <Route path="policies/edit/:id" element={<PolicyAddPage />} />
              <Route path="policies/:id" element={<PolicyDetailPage />} />
              <Route path="renewals" element={<RenewalsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              {/* Admin & Manager Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="references" element={<ReferencesPage />} />
                <Route path="referrals" element={<ReferralsDashboard />} />
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="monthly-reports" element={<MonthlyReportsPage />} />
              </Route>

              {/* Admin Only Route */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>
            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
