import { useEffect } from "react";
import { DashboardLayout } from "./components/DashboardLayout";
import { EmptyState } from "./components/EmptyState";
import { ErrorView } from "./components/ErrorView";
import { Header } from "./components/Header";
import { LoadingView } from "./components/LoadingView";
import { RemoteControlPage } from "./components/RemoteControlPage";
import { useDashboard } from "./hooks/useDashboard";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { AdminPage } from "./components/admin/AdminPage";
import { resolveApplicationRoute } from "./config/applicationRoutes";

const DISPLAY_HEARTBEAT_MS = 2500;

function DisplayPresenceReporter({ displayId }) {
  useEffect(() => {
    let active = true;
    const url = `/api/v1/presentation/${encodeURIComponent(displayId)}/heartbeat`;
    const beat = () => {
      if (!active) return;
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store", keepalive: true }).catch(() => {});
    };
    beat();
    const timer = window.setInterval(beat, DISPLAY_HEARTBEAT_MS);
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    window.addEventListener("focus", beat);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", beat); document.removeEventListener("visibilitychange", onVisible); };
  }, [displayId]);
  return null;
}

function DashboardPage({ displayId }) {
  const { data, error, loading, refreshing, retry, lastSuccessfulRefresh } = useDashboard();
  const displaySettings = useDisplaySettings();

  // While the dashboard is still loading there is no presentation controller yet,
  // so keep a lightweight presence heartbeat. Once DashboardLayout mounts, its
  // controller owns the single authoritative display heartbeat (including memory
  // telemetry) and this fallback disappears.
  if (loading) return <><DisplayPresenceReporter displayId={displayId}/><div className="app-shell"><Header refreshing/><LoadingView/></div></>;
  if (error && !data) return <><DisplayPresenceReporter displayId={displayId}/><div className="app-shell"><Header hasError/><ErrorView message={error.message} onRetry={retry}/></div></>;
  if (!data?.technicians?.length) return <><DisplayPresenceReporter displayId={displayId}/><div className="app-shell"><Header refreshedAt={data?.refreshedAt}/><EmptyState/></div></>;
  return <DashboardLayout data={data} displayId={displayId} displaySettings={displaySettings.settings} error={error} refreshing={refreshing} retry={retry} lastSuccessfulRefresh={lastSuccessfulRefresh}/>;
}

export default function App() {
  const route = resolveApplicationRoute(window.location.pathname, window.location.search);
  if (route.type === "admin") return <AdminPage/>;
  if (route.type === "customize") { window.history.replaceState(null, "", "/remote"); return <RemoteControlPage initialTab="settings" initialSettingsSection="customize"/>; }
  if (route.type === "remote") return <RemoteControlPage/>;
  return <DashboardPage displayId={route.displayId}/>;
}
