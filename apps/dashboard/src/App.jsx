import { DashboardLayout } from "./components/DashboardLayout";
import { EmptyState } from "./components/EmptyState";
import { ErrorView } from "./components/ErrorView";
import { Header } from "./components/Header";
import { LoadingView } from "./components/LoadingView";
import { RemoteControlPage } from "./components/RemoteControlPage";
import { DEFAULT_DISPLAY_ID, findDisplay } from "./config/displayRegistry";
import { useDashboard } from "./hooks/useDashboard";

function DashboardPage({ displayId }) {
  const { data, error, loading, refreshing, retry, lastSuccessfulRefresh } = useDashboard();

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

  return <DashboardLayout data={data} displayId={displayId} error={error} refreshing={refreshing} retry={retry} lastSuccessfulRefresh={lastSuccessfulRefresh} />;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/remote") return <RemoteControlPage />;
  const routeDisplayId = path.match(/^\/display\/([^/]+)$/)?.[1];
  const displayId = routeDisplayId && findDisplay(routeDisplayId) ? routeDisplayId : DEFAULT_DISPLAY_ID;
  return <DashboardPage displayId={displayId} />;
}
