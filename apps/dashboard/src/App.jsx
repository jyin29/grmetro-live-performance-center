import { DashboardLayout } from "./components/DashboardLayout";
import { EmptyState } from "./components/EmptyState";
import { ErrorView } from "./components/ErrorView";
import { Header } from "./components/Header";
import { LoadingView } from "./components/LoadingView";
import { RemoteControlPage } from "./components/RemoteControlPage";
import { useDashboard } from "./hooks/useDashboard";

function DashboardPage() {
  const { data, error, loading, refreshing, retry } = useDashboard();

  if (loading) {
    return <div className="app-shell">
      <Header refreshing />
      <LoadingView />
    </div>;
  }

  if (error && !data) {
    return <div className="app-shell">
      <Header hasError />
      <ErrorView message={error.message} onRetry={retry} />
    </div>;
  }

  if (!data?.technicians?.length) {
    return <div className="app-shell">
      <Header refreshedAt={data?.refreshedAt} />
      <EmptyState />
    </div>;
  }

  return <DashboardLayout data={data} error={error} refreshing={refreshing} />;
}

export default function App() {
  return window.location.pathname.replace(/\/+$/, "") === "/remote" ? <RemoteControlPage /> : <DashboardPage />;
}
