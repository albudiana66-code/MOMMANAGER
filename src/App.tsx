import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { useSubscription } from './hooks/useSubscription';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PaywallScreen } from './screens/PaywallScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { TasksScreen } from './screens/TasksScreen';
import { KidsScreen } from './screens/KidsScreen';
import { KitchenScreen } from './screens/KitchenScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { SelfCareScreen } from './screens/SelfCareScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TermsScreen } from './screens/TermsScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import './i18n';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { hasAccess, state } = useSubscription();

  if (loading || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[#E91E8C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <Routes>
      <Route path="/success" element={<SuccessScreen />} />
      <Route path="/paywall" element={<PaywallScreen />} />
      <Route path="/terms" element={<TermsScreen />} />
      <Route path="/privacy" element={<PrivacyScreen />} />
      {hasAccess ? (
        <>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/tasks" element={<TasksScreen />} />
          <Route path="/kids" element={<KidsScreen />} />
          <Route path="/kitchen" element={<KitchenScreen />} />
          <Route path="/budget" element={<BudgetScreen />} />
          <Route path="/selfcare" element={<SelfCareScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/paywall" replace />} />
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
