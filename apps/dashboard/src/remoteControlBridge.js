const REMOTE_PATH = "/remote";
const PRESENCE_POLL_MS = 1000;
const ONLINE_COLOR = "#087f83";
const OFFLINE_COLOR = "#9aa7ad";

let adminState = null;
let selectedDisplayId = null;

function isRemotePage() {
  return window.location.pathname.replace(/\/+$/, "") === REMOTE_PATH;
}

function displayIdForButton(button) {
  const name = button?.querySelector("strong")?.textContent?.trim();
  if (!name || !adminState?.displays) return null;
  return adminState.displays.find((display) => display.displayName === name)?.displayId || null;
}

function currentSelectedDisplayId() {
  const selected = document.querySelector('.display-picker button[aria-pressed="true"], .display-picker button.is-selected');
  return displayIdForButton(selected) || selectedDisplayId || adminState?.displays?.[0]?.displayId || null;
}

function displayOnline(display) {
  return Boolean(display?.displayOnline || (display?.connectedClients?.displays ?? 0) > 0);
}

function updatePresenceUi() {
  if (!adminState?.displays) return;
  document.querySelectorAll(".display-picker button").forEach((button) => {
    const id = displayIdForButton(button);
    const display = adminState.displays.find((item) => item.displayId === id);
    const online = displayOnline(display);
    button.dataset.displayOnline = online ? "true" : "false";
    const dot = button.querySelector(".display-dot");
    if (dot) {
      dot.style.background = online ? ONLINE_COLOR : OFFLINE_COLOR;
      dot.style.boxShadow = online ? "0 0 0 4px rgba(8,127,131,.12)" : "none";
      dot.title = online ? "Display online" : "Display offline";
      dot.setAttribute("aria-label", online ? "Display online" : "Display offline");
    }
  });

  const id = currentSelectedDisplayId();
  const selected = adminState.displays.find((item) => item.displayId === id);
  const online = displayOnline(selected);
  document.querySelectorAll(".operations-status").forEach((badge) => {
    const text = badge.textContent?.trim().toLowerCase();
    if (text !== "connected" && text !== "offline" && text !== "connecting" && text !== "reconnecting") return;
    badge.textContent = online ? "Connected" : "Offline";
    badge.classList.toggle("is-healthy", online);
    badge.classList.toggle("is-neutral", !online);
  });
}

async function refreshAdmin() {
  if (!isRemotePage()) return;
  try {
    const response = await fetch(`/api/v1/admin?_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("admin state unavailable");
    adminState = await response.json();
    selectedDisplayId = currentSelectedDisplayId();
    updatePresenceUi();
  } catch {
    document.querySelectorAll(".operations-status").forEach((badge) => {
      const text = badge.textContent?.trim().toLowerCase();
      if (["connected", "offline", "connecting", "reconnecting"].includes(text)) {
        badge.textContent = "Offline";
        badge.classList.remove("is-healthy");
        badge.classList.add("is-neutral");
      }
    });
  }
}

function presentationCommand(type, displayId, payload = {}) {
  return { type, displayId, payload };
}

function commandForButton(button, displayId) {
  if (button.closest(".display-direction")) {
    const buttons = [...button.closest(".display-direction").querySelectorAll("button")];
    return presentationCommand(buttons.indexOf(button) === 0 ? "presentation/previous-slide" : "presentation/next-slide", displayId);
  }
  if (button.closest(".display-playback")) {
    const buttons = [...button.closest(".display-playback").querySelectorAll("button")];
    return presentationCommand(buttons.indexOf(button) === 0 ? "presentation/pause-rotation" : "presentation/resume-rotation", displayId);
  }
  if (button.matches(".display-restart") || button.closest(".display-restart")) {
    return presentationCommand("presentation/restart-rotation-timer", displayId);
  }
  const slideButton = button.closest(".operations-slide-buttons button");
  if (slideButton) {
    const buttons = [...slideButton.closest(".operations-slide-buttons").querySelectorAll("button")];
    const index = buttons.indexOf(slideButton);
    if (index >= 0) return presentationCommand("presentation/go-to-slide", displayId, { index });
  }
  return null;
}

async function sendCommand(command) {
  const response = await fetch(`/api/v1/presentation/${encodeURIComponent(command.displayId)}/command?_=${Date.now()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Remote command failed (${response.status})`);
  const result = await response.json();
  window.dispatchEvent(new CustomEvent("grmetro:remote-command-result", { detail: result }));
  return result;
}

function installControlCapture() {
  document.addEventListener("click", (event) => {
    if (!isRemotePage()) return;
    const button = event.target.closest?.(".operations-display-actions button");
    if (!button || button.disabled) return;
    const displayId = currentSelectedDisplayId();
    if (!displayId) return;
    const command = commandForButton(button, displayId);
    if (!command) return;

    // Own the control click so a stale/broken React transport cannot swallow or double-send it.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    button.dataset.remoteSending = "true";
    sendCommand(command)
      .then(() => refreshAdmin())
      .catch((error) => {
        button.dataset.remoteError = error.message;
        console.error("Remote command failed", error);
      })
      .finally(() => { delete button.dataset.remoteSending; });
  }, true);

  document.addEventListener("click", (event) => {
    const displayButton = event.target.closest?.(".display-picker button");
    if (!displayButton) return;
    window.setTimeout(() => {
      selectedDisplayId = displayIdForButton(displayButton) || selectedDisplayId;
      updatePresenceUi();
    }, 0);
  });
}

if (typeof window !== "undefined" && isRemotePage()) {
  installControlCapture();
  window.addEventListener("load", refreshAdmin);
  window.addEventListener("focus", refreshAdmin);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshAdmin(); });
  window.setInterval(refreshAdmin, PRESENCE_POLL_MS);
  refreshAdmin();
}
