import logoUrl from "../../../../assets/branding/grmetro-logo.png";
import { useEffect, useMemo, useState } from "react";
import { fetchAdminState } from "../api/adminApi";
import { fetchRefreshStatus, requestDashboardRefresh } from "../api/managementApi";
import { DEFAULT_DISPLAY_ID } from "../config/displayRegistry";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";
import { usePresentationController } from "../controller/PresentationController";
import { useDashboard } from "../hooks/useDashboard";
import { resolveSelectedTechnician } from "../lib/technicianDetail";
import { refreshLabel } from "../lib/presentation";
import { AdminContent } from "./admin/AdminPage";
import { TechnicianDetail } from "./TechnicianDetail";

export const OPERATIONS_TABS = [
  ["dashboard", "Dashboard"], ["technicians", "Technicians"], ["displays", "Displays"],
  ["management", "Management"], ["administration", "Administration"], ["diagnostics", "Diagnostics"],
];

const ADMIN_POLL_MS = 5_000;
const AUTO_REFRESH_MS = 60_000;

function useLiveAdminState() {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let active = true;
    const load = () => fetchAdminState().then((data) => active && setState({ data, error: null }))
      .catch((error) => active && setState((current) => ({ ...current, error })));
    load();
    const interval = window.setInterval(load, ADMIN_POLL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  return state;
}

function Status({ value }) {
  const healthy = ["connected", "running", "available", "healthy", "active"].includes(String(value).toLowerCase());
  return <span className={`operations-status ${healthy ? "is-healthy" : "is-neutral"}`}>{value || "Unavailable"}</span>;
}

function DefinitionCards({ items }) {
  return <div className="operations-definitions">{items.map(({ label, value }) => <article key={label}><span>{label}</span><strong>{value ?? "Unavailable"}</strong></article>)}</div>;
}

export function DashboardTab({ dashboard, admin, controller, countdown }) {
  const refreshedAt = dashboard.data?.refreshedAt || admin?.diagnostics?.lastSuccessfulRefreshAt;
  return <div className="operations-stack">
    <section className="operations-hero-card"><p>Live operations</p><h2>Performance Center status</h2><DefinitionCards items={[
      { label: "Last refresh time", value: refreshedAt ? refreshLabel(refreshedAt) : "Waiting for data" },
      { label: "Next automatic refresh", value: `${countdown} sec` },
      { label: "Backend status", value: <Status value={admin?.system?.backendStatus} /> },
      { label: "WebSocket status", value: <Status value={controller.connectionState} /> },
      { label: "Active event", value: controller.event?.title || admin?.events?.activeEvent?.title || "None" },
      { label: "Connected displays", value: admin?.system?.connectedDisplays ?? "—" },
      { label: "Connected remotes", value: admin?.system?.connectedRemotes ?? "—" },
    ]} /></section>
    {dashboard.error && <div className="operations-alert" role="status">Live KPI update delayed. The last successful data remains visible.</div>}
  </div>;
}

export function DisplayControls({ controller }) {
  return <div className="operations-display-actions" aria-label={`Controls for ${controller.displayName}`}>
    <button type="button" onClick={controller.pauseRotation} disabled={!controller.isRunning}>Pause</button>
    <button type="button" onClick={controller.resumeRotation} disabled={controller.isRunning}>Resume</button>
    <button type="button" onClick={controller.restartRotationTimer}>Restart Rotation</button>
    <div className="operations-slide-buttons" aria-label="Jump to slide">{controller.slides.map((slide, index) => <button type="button" key={slide.id} className={controller.activeSlideIndex === index ? "is-active" : ""} aria-pressed={controller.activeSlideIndex === index} onClick={() => controller.selectSlide(index)}>{slide.label}</button>)}</div>
  </div>;
}

export function DisplaysTab({ admin, controller, selectedDisplayId, onSelectDisplay, onRefresh }) {
  return <div className="operations-stack"><section className="operations-section"><div className="operations-section__heading"><div><p>Display manager</p><h2>Connected displays</h2></div><button type="button" className="operations-primary" onClick={onRefresh}>Refresh Dashboard</button></div>
    <div className="operations-display-list">{(admin?.displays || []).map((display) => <button type="button" key={display.displayId} onClick={() => onSelectDisplay(display.displayId)} className={display.displayId === selectedDisplayId ? "is-selected" : ""} aria-pressed={display.displayId === selectedDisplayId}>
      <strong>{display.displayName}</strong><span>{display.currentSlide?.label || "Unknown slide"} · {display.isRunning ? "Running" : "Paused"}</span><small>{display.connectedClients?.total || 0} connected clients</small>
    </button>)}</div>
  </section>
  <section className="operations-section"><div className="operations-section__heading"><div><p>Selected display</p><h2>{controller.displayName}</h2></div><Status value={controller.connectionState} /></div>
    <DefinitionCards items={[
      { label: "Current Slide", value: controller.activeSlide?.label }, { label: "Presentation Profile", value: controller.presentationProfile },
      { label: "Rotation State", value: controller.isRunning ? "Running" : "Paused" }, { label: "Connected Clients", value: admin?.displays?.find((item) => item.displayId === selectedDisplayId)?.connectedClients?.total ?? "—" },
      { label: "Current Event", value: controller.event?.title || admin?.events?.activeEvent?.title || "None" }, { label: "Last Synchronization", value: controller.lastSynchronization ? new Date(controller.lastSynchronization).toLocaleTimeString() : "Waiting" },
      { label: "WebSocket Status", value: controller.connectionState },
    ]} /><DisplayControls controller={controller} />
  </section></div>;
}

function ItemList({ title, items, empty = "None currently" }) {
  return <section className="operations-feed"><h3>{title}</h3>{items?.length ? <ul>{items.map((item, index) => <li key={item.id || item.ruleId || index}><strong>{item.title || item.label || item.type || item.ruleId}</strong><span>{item.detail || item.message || item.priority || "Active"}</span></li>)}</ul> : <p>{empty}</p>}</section>;
}

export function ManagementTab({ data }) {
  const events = data?.events || [];
  const insights = data?.managementInsights || [];
  const alerts = insights.filter((item) => ["critical", "warning"].includes(item.priority));
  const celebrations = events.filter((item) => item.priority === "celebration" || item.category === "celebration");
  return <div className="operations-feed-grid">
    <ItemList title="Current Management Insights" items={insights} />
    <ItemList title="Recent Events" items={events} />
    <ItemList title="Current Alerts" items={alerts} />
    <ItemList title="Recent Celebrations" items={celebrations} />
    <ItemList title="Business Rule Results" items={[...(insights || []), ...(events || [])]} />
  </div>;
}

export function DiagnosticsTab({ admin, controller }) {
  return <section className="operations-section"><div className="operations-section__heading"><div><p>Runtime diagnostics</p><h2>System health</h2></div><Status value={admin?.system?.backendStatus} /></div><DefinitionCards items={[
    { label: "Backend", value: admin?.system?.backendStatus }, { label: "Dashboard", value: admin?.system?.dashboardStatus },
    { label: "Presentation", value: controller.isRunning ? "Running" : "Paused" }, { label: "Display Manager", value: admin?.displays?.length ? "Active" : "Waiting" },
    { label: "WebSocket", value: admin?.system?.websocketStatus }, { label: "Refresh Scheduler", value: admin?.diagnostics?.cacheAvailable ? "Active" : "Waiting" },
    { label: "Watchdog", value: `${RUNTIME_SETTINGS.watchdogIntervalMs / 1000} sec interval` }, { label: "Kiosk Mode", value: RUNTIME_SETTINGS.kioskMode ? "Enabled" : "Disabled" },
    { label: "Connection Quality", value: controller.connectionState === "connected" ? "Healthy" : "Recovering" }, { label: "Reconnect Count", value: controller.reconnectCount },
    { label: "Build Version", value: admin?.system?.buildVersion || RUNTIME_SETTINGS.buildVersion || "Development" }, { label: "Application Version", value: admin?.system?.applicationVersion },
  ]} /></section>;
}

export function RemoteControlPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDisplayId, setSelectedDisplayId] = useState(DEFAULT_DISPLAY_ID);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(null);
  const [search, setSearch] = useState("");
  const [refreshStatus, setRefreshStatus] = useState({ state: "idle", message: "Ready to refresh" });
  const [now, setNow] = useState(Date.now());
  const dashboard = useDashboard();
  const adminState = useLiveAdminState();
  const controller = usePresentationController(selectedDisplayId, "remote");
  const technicians = dashboard.data?.technicians || [];
  const selectedTechnician = resolveSelectedTechnician(technicians, selectedTechnicianId);
  const filteredTechnicians = useMemo(() => technicians.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [search, technicians]);
  useEffect(() => { fetchRefreshStatus().then(setRefreshStatus).catch(() => {}); }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  async function refreshDashboard() { setRefreshStatus({ state: "refreshing", message: "Refreshing dashboard data…" }); try { setRefreshStatus(await requestDashboardRefresh()); dashboard.retry({ background: true }); } catch (error) { setRefreshStatus({ state: "failed", message: error.message }); } }
  const refreshedAt = new Date(dashboard.data?.refreshedAt || now).getTime();
  const countdown = Math.max(0, Math.ceil((refreshedAt + AUTO_REFRESH_MS - now) / 1000));

  return <main className="operations-console"><header className="operations-header"><img src={logoUrl} alt="GRmetro Heating & Cooling" /><div><p>Live Performance Center</p><h1>Operations Console</h1></div><div className="operations-header__live"><Status value={controller.connectionState} /><span>{refreshStatus.message}</span></div></header>
    <nav className="operations-tabs" aria-label="Operations Console sections">{OPERATIONS_TABS.map(([id, label]) => <button type="button" key={id} className={activeTab === id ? "is-active" : ""} aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
    <div className="operations-content" role="tabpanel" aria-label={OPERATIONS_TABS.find(([id]) => id === activeTab)?.[1]}>
      {activeTab === "dashboard" && <DashboardTab dashboard={dashboard} admin={adminState.data} controller={controller} countdown={countdown} />}
      {activeTab === "technicians" && <div className="operations-stack"><section className="operations-section"><div className="operations-section__heading"><div><p>Team</p><h2>Technicians</h2></div><label className="operations-search">Search technicians<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="operations-technicians" role="list">{filteredTechnicians.map((technician) => <button type="button" role="listitem" key={technician.id} aria-pressed={String(technician.id) === String(selectedTechnician?.id)} className={String(technician.id) === String(selectedTechnician?.id) ? "is-selected" : ""} onClick={() => setSelectedTechnicianId(technician.id)}><span>{technician.initials}</span><strong>{technician.name}</strong></button>)}</div></section><TechnicianDetail data={dashboard.data} selectedId={selectedTechnician?.id} /></div>}
      {activeTab === "displays" && <DisplaysTab admin={adminState.data} controller={controller} selectedDisplayId={selectedDisplayId} onSelectDisplay={setSelectedDisplayId} onRefresh={refreshDashboard} />}
      {activeTab === "management" && <ManagementTab data={dashboard.data} />}
      {activeTab === "administration" && (adminState.data ? <div className="operations-admin"><AdminContent data={adminState.data} /></div> : <div className="operations-alert">Loading administration information…</div>)}
      {activeTab === "diagnostics" && <DiagnosticsTab admin={adminState.data} controller={controller} />}
    </div>
  </main>;
}
