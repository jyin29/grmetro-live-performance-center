"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
let server; let React; let renderToStaticMarkup; let TechnicianPerformanceCard; let nativeRemote;

before(async () => {
  const { createServer } = await import("vite");
  React = await import("react");
  ({ renderToStaticMarkup } = await import("react-dom/server"));
  server = await createServer({ root: "apps/dashboard", server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ TechnicianPerformanceCard } = await server.ssrLoadModule("/src/components/TechnicianPerformanceCard.jsx"));
  nativeRemote = await server.ssrLoadModule("/src/components/NativeRemoteAccess.jsx");
});

after(async () => server?.close());

test("native restart feedback is versioned, temporary, and restores exact helper defaults", () => {
  const launcher = read("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(launcher, /function Set-DetailText/);
  assert.match(launcher, /function Set-TransientDetail/);
  assert.match(launcher, /detailVersions/);
  assert.match(launcher, /detailResets\.Remove\(\$name\)/);
  assert.match(launcher, /'Restart backend only'/);
  assert.match(launcher, /'Relaunch dedicated Edge'/);
  assert.match(launcher, /Set-TransientDetail \$operation\.Detail/);
  assert.match(launcher, /Set-TransientDetail\([^)]*seconds=8\)/);
});

test("ServiceTitan restart runs in a hidden child operation outside the WPF dispatcher", () => {
  const launcher = read("scripts/windows/performance-center-launcher-v2.ps1");
  const handler = launcher.match(/\(C 'RestartBrowserButton'\)\.Add_Click\(\{([\s\S]*?)\}\)\r?\n/)[1];
  assert.match(handler, /Start-NativeOperation/);
  assert.doesNotMatch(handler, /Run-HiddenWait|Start-Sleep|Wait-Backend|Invoke-RestMethod/);
  assert.match(launcher, /Start-Process powershell\.exe[\s\S]*-WindowStyle Hidden[\s\S]*-PassThru/);
  assert.doesNotMatch(launcher.match(/function Start-NativeOperation[\s\S]*?\n\}/)[0], /-Wait/);
  const control = read("scripts/windows/supervisor-control.ps1");
  assert.match(control, /Wait-GrMetroCondition \{ ServiceTitan-Healthy \} 45/);
  assert.match(launcher, /Set-NativeOperationInterlock[\s\S]*\$primary,\$login,\$refreshButton,\$restartBackendButton,\$restartBrowserButton/);
  const edge = read("scripts/windows/restart-servicetitan-edge.ps1");
  assert.match(edge, /Resolve-GrMetroServiceTitanProfilePath/);
  assert.match(edge, /Test-GrMetroEdgeCommandLineUsesProfile/);
  assert.match(edge, /launch-edge\.ps1"\) -ProfilePath \$profile/);
  assert.doesNotMatch(edge, /Remove-Item|Clear-/);
});

test("native control center opens maximized with content-sized header status", () => {
  const launcher = read("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(launcher, /WindowState="Maximized"/);
  assert.match(launcher, /<ColumnDefinition Width="\*"\/><ColumnDefinition Width="Auto"\/>/);
  assert.match(launcher, /StackPanel Grid\.Column="1" HorizontalAlignment="Right"/);
  assert.doesNotMatch(launcher, /WindowStyle="None"|ResizeMode="NoResize"/);
});

test("Technician fallback rank explains actual coverage and omits orphan movement", () => {
  const technician = { id: 1, name: "Alex K", initials: "AK", overall: { qualifies: false, validWeight: .3, rank: null, rankChange: null }, kpis: { revenue: { id: "revenue", hasData: true, value: 2572, format: "currency", rank: 1, rankLabel: "#1", dataQuality: "confirmed" } } };
  const markup = renderToStaticMarkup(React.createElement(TechnicianPerformanceCard, { technician, data: { technicians: [technician] }, metricVisibility: { revenue: true } }));
  assert.match(markup, /Revenue Rank/);
  assert.match(markup, /Overall rank pending · 30% goal-backed KPI coverage/);
  assert.doesNotMatch(markup, /Not qualified|No movement/);
  const css = read("apps/dashboard/src/final-tv-readability.css");
  assert.match(css, /technician-metric[^}]*padding:7px 15px 8px/);
  assert.match(css, /performance-card__rank-context:empty/);
});

test("Recognition adds restrained silver and bronze accents while retaining the crown", () => {
  const css = read("apps/dashboard/src/final-tv-readability.css");
  assert.match(css, /podium-card--2::after \{ content:"SILVER"/);
  assert.match(css, /podium-card--3::after \{ content:"BRONZE"/);
  assert.match(css, /champion-crown[^}]*scaleX\(1\.65\)/);
});

test("native Phone Remote hosts the real local remote and carries a clean LAN QR", () => {
  const configuration = nativeRemote.nativeRemoteConfiguration({ search: "?nativeHost=1&share=http%3A%2F%2F10.1.10.207%3A3000%2Fremote" });
  assert.equal(configuration.shareUrl, "http://10.1.10.207:3000/remote");
  assert.equal(nativeRemote.nativeRemoteConfiguration({ search: "" }), null);
  const modules = nativeRemote.buildQrModules(configuration.shareUrl);
  assert.ok(modules.length > 20);
  assert.ok(modules.every((row) => row.length === modules.length));
  const nativeUi = read("scripts/windows/native-operator-ui.ps1");
  assert.match(nativeUi, /--app=/);
  assert.match(nativeUi, /GRMetro\\Remote App Profile/);
  assert.match(nativeUi, /nativeHost=1&share=/);
  assert.match(read("apps/dashboard/src/components/NativeRemoteAccess.jsx"), /Show Phone QR/);
});
