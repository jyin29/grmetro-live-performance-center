import { describe, expect, it, vi } from "vitest";
import { fetchRefreshStatus, requestDashboardRefresh } from "../src/api/managementApi";

describe("management remote API", () => {
  it("reads refresh status and requests a manual scheduler refresh", async () => {
    const fetchImpl = vi.fn(async (url, options) => ({ ok: true, json: async () => ({ state: options?.method ? "succeeded" : "idle" }) }));
    await expect(fetchRefreshStatus(fetchImpl)).resolves.toEqual({ state: "idle" });
    await expect(requestDashboardRefresh(fetchImpl)).resolves.toEqual({ state: "succeeded" });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "/api/v1/management/refresh", expect.objectContaining({ method: "POST" }));
  });

  it("surfaces the safe refresh failure message", async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({ message: "Dashboard refresh failed." }) });
    await expect(requestDashboardRefresh(fetchImpl)).rejects.toMatchObject({ name: "ManagementApiError", status: 503, message: "Dashboard refresh failed." });
  });
});
