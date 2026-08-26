const POLL_MS = 2000;

function applyPresence(displays = []) {
  const byName = new Map(displays.map((display) => [display.displayName, Boolean(display.displayOnline || (display.connectedClients?.displays ?? 0) > 0)]));
  document.querySelectorAll(".display-picker button").forEach((button) => {
    const name = button.querySelector("strong")?.textContent?.trim();
    const online = byName.get(name) === true;
    button.classList.toggle("is-display-online", online);
    button.classList.toggle("is-display-offline", !online);
    const dot = button.querySelector(".display-dot");
    if (dot) {
      dot.title = online ? "Display online" : "Display offline";
      dot.setAttribute("aria-label", online ? "Display online" : "Display offline");
    }
  });
}

async function refreshPresence() {
  if (!window.location.pathname.startsWith("/remote")) return;
  try {
    const response = await fetch("/api/v1/admin", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    applyPresence(payload.displays || []);
  } catch { /* the controller status handles server-offline state */ }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", refreshPresence);
  window.setInterval(refreshPresence, POLL_MS);
  const observer = new MutationObserver(() => refreshPresence());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
