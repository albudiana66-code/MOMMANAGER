import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { GreetingCard } from '../components/dashboard/GreetingCard';
import { StatsRow } from '../components/dashboard/StatsRow';
import { AICard } from '../components/dashboard/AICard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { TrialBanner } from '../components/paywall/TrialBanner';
import { useNavigate } from 'react-router-dom';

export function DashboardScreen() {
  const navigate = useNavigate();

  return (
    <Layout background="url('/bg-dashboard.jpg') center/cover no-repeat" style={{}}>

      <Header
        right={
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            ⚙️
          </button>
        }
      />
      <TrialBanner />
      <GreetingCard />
      <StatsRow />
      <AICard />
      <QuickActions />
      <div className="h-4" />
    </Layout>
  );
}
