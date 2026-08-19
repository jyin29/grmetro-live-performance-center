export class ManagementApiError extends Error {
  constructor(message, status) { super(message); this.name = "ManagementApiError"; this.status = status; }
}
async function read(response) { const body = await response.json().catch(() => null); if (!response.ok) throw new ManagementApiError(body?.message || "Could not update dashboard management settings.", response.status); return body; }
export async function fetchRefreshStatus(fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/refresh", { headers: { accept: "application/json" } })); }
export async function requestDashboardRefresh(fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/refresh", { method: "POST", headers: { accept: "application/json" } })); }
export async function fetchDashboardPeriod(fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/period", { headers: { accept: "application/json" } })); }
export async function setDashboardPeriod(period, fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/period", { method: "PUT", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ period }) })); }
export async function fetchGoals(period, fetchImpl = fetch) { const query=period?`?period=${encodeURIComponent(period)}`:""; return read(await fetchImpl(`/api/v1/management/goals${query}`, { headers: { accept: "application/json" } })); }
export async function saveGoals(goals, fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/goals", { method: "PUT", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(goals) })); }
export async function fetchDisplaySettings(fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/display-settings", { headers: { accept: "application/json" } })); }
export async function saveDisplaySettings(settings, fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/display-settings", { method: "PUT", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(settings) })); }
export async function fetchSpreadsheetSlide(fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/spreadsheet-slide", { headers: { accept: "application/json" } })); }
export async function saveSpreadsheetSlide(slide, fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/spreadsheet-slide", { method: "PUT", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(slide) })); }
export async function removeSpreadsheetSlide(fetchImpl = fetch) { return read(await fetchImpl("/api/v1/management/spreadsheet-slide", { method: "DELETE", headers: { accept: "application/json" } })); }
