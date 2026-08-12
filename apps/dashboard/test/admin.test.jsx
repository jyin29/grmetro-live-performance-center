import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveApplicationRoute } from "../src/config/applicationRoutes";
import { AdminContent } from "../src/components/admin/AdminPage";

const data = {
  displays: [{ displayId: "main-office", displayName: "Main Office", presentationProfile: "standard",
    activeSlideIndex: 0, currentSlide: { id: "revenue", label: "Revenue" }, isRunning: true,
    nextRotationAt: "2026-08-12T15:00:30.000Z", connectedClients: { displays: 1, remotes: 2, total: 3 } }],
  businessRules: { settings: { cooldownMilliseconds: 1_800_000, eventDurationMilliseconds: 3_000 }, rules: [{
    id: "sample-rule", category: "celebration", priority: "celebration", scope: "technician",
    condition: { path: "overall.rank", operator: "equals", value: 1 }, action: { type: "event", eventType: "new-leader" }
  }] },
  events: { queueSize: 20, pendingEvents: 2, cooldownMilliseconds: 1_800_000, eventDurationMilliseconds: 3_000, overlayDurationMilliseconds: 7_000, activeEvent: { title: "New leader" } },
  presentation: { rotationIntervalMilliseconds: 30_000, profiles: ["standard"], slides: [{ id: "revenue", label: "Revenue" }] },
  diagnostics: { cacheAvailable: true, lastSuccessfulRefreshAt: "2026-08-12T15:00:00.000Z", lastFailureCode: null },
  system: { applicationVersion: "1.0.0", buildVersion: "abc123", uptimeSeconds: 125, websocketStatus: "running", backendStatus: "running", dashboardStatus: "available", connectedClients: 3, connectedDisplays: 1, connectedRemotes: 2 }
};
const runtime = { kioskMode: true, diagnosticsVisible: false, watchdogIntervalMs: 15_000, buildVersion: null };

describe("administration platform", () => {
  it("routes /admin separately from displays and the remote", () => {
    expect(resolveApplicationRoute("/admin")).toEqual({ type: "admin" });
    expect(resolveApplicationRoute("/remote")).toEqual({ type: "remote" });
    expect(resolveApplicationRoute("/display/main-office")).toEqual({ type: "display", displayId: "main-office" });
  });

  it("renders registered display state", () => {
    const markup = renderToStaticMarkup(<AdminContent data={data} runtimeSettings={runtime} />);
    expect(markup).toContain("Display Management"); expect(markup).toContain("Main Office"); expect(markup).toContain("Revenue"); expect(markup).toContain("Running");
  });

  it("renders rule inspection fields", () => {
    const markup = renderToStaticMarkup(<AdminContent data={data} runtimeSettings={runtime} />);
    for (const value of ["sample-rule", "celebration", "overall.rank equals 1", "event · new-leader", "Enabled", "30 min", "3 sec"]) expect(markup).toContain(value);
  });

  it("renders diagnostics and system health", () => {
    const markup = renderToStaticMarkup(<AdminContent data={data} runtimeSettings={runtime} />);
    for (const value of ["Diagnostics", "Cache", "System Information", "abc123", "Connected displays", "Connected remotes"]) expect(markup).toContain(value);
  });

  it("renders presentation, event, kiosk, and queue configuration", () => {
    const markup = renderToStaticMarkup(<AdminContent data={data} runtimeSettings={runtime} />);
    for (const value of ["Presentation Settings", "30 sec", "Kiosk mode", "Event Settings", "Queue size", "Pending events", "New leader"]) expect(markup).toContain(value);
  });
});
