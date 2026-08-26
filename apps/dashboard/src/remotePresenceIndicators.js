const POLL_MS = 1000;
let lastDisplays = [];

function isRemotePage() {
  return window.location.pathname.replace(/\/+$/, "") === "/remote";
}

async function fetchJson(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`request failed (${response.status})`);
  return response.json();
}

function selectedDisplayId() {
  const selected = document.querySelector('.display-picker button[aria-pressed="true"], .display-picker button.is-selected');
  const name = selected?.querySelector("strong")?.textContent?.trim();
  return lastDisplays.find((display) => display.displayName === name)?.displayId || null;
}

function paintStatus(online) {
  document.querySelectorAll(".operations-status").forEach((badge) => {
    const value = badge.textContent?.trim().toLowerCase();
    if (!["connected", "offline", "connecting", "reconnecting"].includes(value)) return;
    badge.textContent = online ? "Connected" : "Offline";
    badge.classList.toggle("is-healthy", online);
    badge.classList.toggle("is-neutral", !online);
  });
}

async function refreshPresence() {
  if (!isRemotePage()) return;
  try {
    const admin = await fetchJson("/api/v1/admin");
    lastDisplays = admin.displays || [];
    const presenceById = new Map();

    await Promise.all(lastDisplays.map(async (display) => {
      try {
        const payload = await fetchJson(`/api/v1/presentation/${encodeURIComponent(display.displayId)}`);
        presenceById.set(display.displayId, payload.online === true);
      } catch {
        presenceById.set(display.displayId, false);
      }
    }));

    document.querySelectorAll(".display-picker button").forEach((button) => {
      const name = button.querySelector("strong")?.textContent?.trim();
      const display = lastDisplays.find((item) => item.displayName === name);
      const online = display ? presenceById.get(display.displayId) === true : false;
      button.classList.toggle("is-display-online", online);
      button.classList.toggle("is-display-offline", !online);
      button.dataset.displayOnline = online ? "true" : "false";
      const dot = button.querySelector(".display-dot");
      if (dot) {
        dot.title = online ? "Display online" : "Display offline";
        dot.setAttribute("aria-label", online ? "Display online" : "Display offline");
      }
    });

    const selectedId = selectedDisplayId();
    paintStatus(selectedId ? presenceById.get(selectedId) === true : false);
  } catch {
    document.querySelectorAll(".display-picker button").forEach((button) => {
      button.classList.remove("is-display-online");
      button.classList.add("is-display-offline");
    });
    paintStatus(false);
  }
}

if (typeof window !== "undefined" && isRemotePage()) {
  window.addEventListener("load", refreshPresence);
  window.addEventListener("focus", refreshPresence);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshPresence(); });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".display-picker button")) window.setTimeout(refreshPresence, 0);
  });
  window.setInterval(refreshPresence, POLL_MS);
  refreshPresence();
}
