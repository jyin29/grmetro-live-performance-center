import { DashboardLayout } from "./components/DashboardLayout";
import { EmptyState } from "./components/EmptyState";
import { ErrorView } from "./components/ErrorView";
import { Header } from "./components/Header";
import { LoadingView } from "./components/LoadingView";
import { useDashboard } from "./hooks/useDashboard";

export default function App() {
  const { data, error, loading, refreshing, retry } = useDashboard();
  if (loading) return <div className="app-shell"><Header refreshedAt={null} refreshing /><LoadingView /></div>;
  if (error && !data) return <div className="app-shell"><Header refreshedAt={null} hasError /><ErrorView message={error.message} onRetry={() => retry()} /></div>;
  if (!data?.technicians?.length) return <div className="app-shell"><Header refreshedAt={data?.lastSuccessfulRefreshAt ?? data?.refreshedAt} /><EmptyState /></div>;
  return <DashboardLayout data={data} error={error} refreshing={refreshing} />;
}
