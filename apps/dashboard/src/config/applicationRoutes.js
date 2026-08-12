import { DEFAULT_DISPLAY_ID, findDisplay } from "./displayRegistry.js";

export function resolveApplicationRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return { type: "admin" };
  if (path === "/remote") return { type: "remote" };
  const displayId = path.match(/^\/display\/([^/]+)$/)?.[1];
  return { type: "display", displayId: displayId && findDisplay(displayId) ? displayId : DEFAULT_DISPLAY_ID };
}
