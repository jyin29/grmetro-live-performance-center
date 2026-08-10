const DASHBOARD_ENDPOINT = "/api/v1/dashboard";

export class DashboardApiError extends Error {
  constructor(message, code = "DASHBOARD_REQUEST_FAILED") {
    super(message);
    this.name = "DashboardApiError";
    this.code = code;
  }
}

export async function fetchDashboard({ signal } = {}) {
  let response;
  try {
    response = await fetch(DASHBOARD_ENDPOINT, { headers: { Accept: "application/json" }, signal });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new DashboardApiError("The Live Performance Center could not be reached.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new DashboardApiError(
      body?.error?.code === "CACHE_UNAVAILABLE"
        ? "Waiting for the first live ServiceTitan update."
        : "Live performance data is temporarily unavailable.",
      body?.error?.code
    );
  }
  if (!body || !Array.isArray(body.technicians) || !body.slides) {
    throw new DashboardApiError("The dashboard received an unexpected response.", "INVALID_DASHBOARD_PAYLOAD");
  }
  return body;
}

export { DASHBOARD_ENDPOINT };
