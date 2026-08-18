import { DashboardLayout } from "./components/DashboardLayout";
import { EmptyState } from "./components/EmptyState";
import { ErrorView } from "./components/ErrorView";
import { Header } from "./components/Header";
import { LoadingView } from "./components/LoadingView";
import { RemoteControlPage } from "./components/RemoteControlPage";
import { MetricCustomization } from "./components/MetricCustomization";
import { SpreadsheetCustomization } from "./components/SpreadsheetCustomization";
import { useDashboard } from "./hooks/useDashboard";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { AdminPage } from "./components/admin/AdminPage";
import { resolveApplicationRoute } from "./config/applicationRoutes";

function DashboardPage({ displayId }) {
  const { data, error, loading, refreshing, retry, lastSuccessfulRefresh } = useDashboard(); const displaySettings = useDisplaySettings();
  if (loading) return <div className="app-shell"><Header refreshing /><LoadingView /></div>;
  if (error && !data) return <div className="app-shell"><Header hasError /><ErrorView message={error.message} onRetry={retry} /></div>;
  if (!data?.technicians?.length) return <div className="app-shell"><Header refreshedAt={data?.refreshedAt} /><EmptyState /></div>;
  return <DashboardLayout data={data} displayId={displayId} displaySettings={displaySettings.settings} error={error} refreshing={refreshing} retry={retry} lastSuccessfulRefresh={lastSuccessfulRefresh} />;
}
function CustomizePage() { return <main className="customization-page"><a className="customization-page__back" href="/remote">← Back to Remote</a><MetricCustomization /><SpreadsheetCustomization /></main>; }
export default function App() { const route = resolveApplicationRoute(window.location.pathname); if (route.type === "admin") return <AdminPage />; if (route.type === "remote") return <RemoteControlPage />; if (route.type === "customize") return <CustomizePage />; return <DashboardPage displayId={route.displayId} />; }
