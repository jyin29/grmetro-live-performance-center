const POLL_MS = 2000;
let lastDisplays = [];

function isRemotePage() {
  return window.location.pathname.replace(/\/+$/, "") === "/remote";
}

async function fetchJson(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(`request failed (${response.status})`);
  return response.json();
}

function normalizedStatus(display) {
  if (!display) return "offline";
  if (display.displayOnline === true || (display.connectedClients?.displays || 0) > 0) return "connected";
  return "offline";
}

function anyDisplayOnline() {
  return lastDisplays.some((display) => normalizedStatus(display) === "connected");
}

function paintHomeAggregateStatus() {
  const home = document.querySelector(".home-status-card");
  if (!home) return;
  const badges = home.querySelectorAll(".operations-status");
  const online = anyDisplayOnline();
  badges.forEach((badge) => {
    const value = badge.textContent?.trim().toLowerCase();
    if (!["connected", "offline", "connecting", "reconnecting", "error"].includes(value)) return;
    badge.textContent = online ? "Connected" : "Offline";
    badge.classList.toggle("is-healthy", online);
    badge.classList.remove("is-warning");
    badge.classList.toggle("is-neutral", !online);
  });
}

function paintDisplayButtons() {
  document.querySelectorAll(".display-picker button").forEach((button) => {
    const name = button.querySelector("strong")?.textContent?.trim();
    const display = lastDisplays.find((item) => item.displayName === name);
    const status = normalizedStatus(display);
    button.classList.toggle("is-display-online", status === "connected");
    button.classList.remove("is-display-error");
    button.classList.toggle("is-display-offline", status !== "connected");
    button.dataset.displayStatus = status;
    const dot = button.querySelector(".display-dot");
    if (dot) {
      const label = status === "connected" ? "Display connected" : "Display offline";
      dot.title = label;
      dot.setAttribute("aria-label", label);
    }
  });
}

async function refreshPresence() {
  if (!isRemotePage()) return;
  try {
    const admin = await fetchJson("/api/v1/admin");
    lastDisplays = admin.displays || [];
    paintDisplayButtons();
    paintHomeAggregateStatus();
  } catch {
    document.querySelectorAll(".display-picker button").forEach((button) => {
      button.classList.remove("is-display-online", "is-display-offline");
      button.classList.add("is-display-error");
      button.dataset.displayStatus = "error";
      const dot = button.querySelector(".display-dot");
      if (dot) {
        dot.title = "Status unavailable";
        dot.setAttribute("aria-label", "Status unavailable");
      }
    });
    // Do not force the Home status offline when the admin request itself fails.
  }
}

if (typeof window !== "undefined" && isRemotePage()) {
  window.addEventListener("load", refreshPresence);
  window.addEventListener("focus", refreshPresence);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshPresence();
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".display-picker button")) window.setTimeout(refreshPresence, 50);
  });
  window.setInterval(refreshPresence, POLL_MS);
  refreshPresence();
}
