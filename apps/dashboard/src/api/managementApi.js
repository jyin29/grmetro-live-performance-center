export class ManagementApiError extends Error {
  constructor(message, status) { super(message); this.name = "ManagementApiError"; this.status = status; }
}

async function read(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ManagementApiError(body?.message || "Could not refresh the dashboard.", response.status);
  return body;
}

export async function fetchRefreshStatus(fetchImpl = fetch) {
  return read(await fetchImpl("/api/v1/management/refresh", { headers: { accept: "application/json" } }));
}

export async function requestDashboardRefresh(fetchImpl = fetch) {
  return read(await fetchImpl("/api/v1/management/refresh", { method: "POST", headers: { accept: "application/json" } }));
}
