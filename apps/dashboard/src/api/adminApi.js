const ADMIN_ENDPOINT = "/api/v1/admin";

export async function fetchAdminState({ signal } = {}) {
  const response = await fetch(ADMIN_ENDPOINT, { headers: { Accept: "application/json" }, signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.system || !Array.isArray(body.displays)) {
    throw new Error("Administration data is temporarily unavailable.");
  }
  return body;
}

export { ADMIN_ENDPOINT };
