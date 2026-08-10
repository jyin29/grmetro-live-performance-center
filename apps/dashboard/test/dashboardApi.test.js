import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardApiError, fetchDashboard } from "../src/api/dashboardApi";

afterEach(() => vi.unstubAllGlobals());

describe("dashboard API service", () => {
  it("requests and validates the stable dashboard endpoint", async () => {
    const payload = { technicians: [], slides: {} };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchDashboard()).resolves.toBe(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/dashboard", expect.objectContaining({ headers: { Accept: "application/json" } }));
  });

  it("turns backend errors into friendly UI-safe messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { code: "CACHE_UNAVAILABLE" } }) }));
    await expect(fetchDashboard()).rejects.toMatchObject({ name: "DashboardApiError", code: "CACHE_UNAVAILABLE", message: "Waiting for the first live ServiceTitan update." });
  });

  it("rejects malformed success responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    await expect(fetchDashboard()).rejects.toBeInstanceOf(DashboardApiError);
  });
});
