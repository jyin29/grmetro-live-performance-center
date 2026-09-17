import { DEFAULT_DISPLAY_ID, findDisplay } from "./displayRegistry.js";

export function resolveApplicationRoute(pathname, search = "") {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return { type: "admin" };
  if (path === "/remote") return { type: "remote" };
  if (path === "/customize") return { type: "customize" };

  // Packaged displays use the always-working root SPA URL with ?display=<id>.
  // Keep /display/<id> supported for development/backward compatibility.
  const queryDisplayId = new URLSearchParams(search).get("display");
  const pathDisplayId = path.match(/^\/display\/([^/]+)$/)?.[1];
  const displayId = queryDisplayId || pathDisplayId;
  return { type: "display", displayId: displayId && findDisplay(displayId) ? displayId : DEFAULT_DISPLAY_ID };
}
