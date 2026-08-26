const POLL_MS = 2000;

async function fetchDisplayOnline(displayId) {
  try {
    const response = await fetch(`/api/v1/presentation/${encodeURIComponent(displayId)}`, { cache: "no-store" });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload.online === true;
  } catch { return false; }
}

async function refreshPresence() {
  if (!window.location.pathname.startsWith("/remote")) return;
  const buttons = [...document.querySelectorAll(".display-picker button")];
  await Promise.all(buttons.map(async (button) => {
    // RemoteControlPage exposes the canonical display id on each picker button.
    // Fall back to the existing DOM value only for an older cached bundle.
    const displayId = button.dataset.displayId;
    const online = displayId ? await fetchDisplayOnline(displayId) : false;
    button.classList.toggle("is-display-online", online);
    button.classList.toggle("is-display-offline", !online);
    const dot = button.querySelector(".display-dot");
    if (dot) {
      dot.title = online ? "Display online" : "Display offline";
      dot.setAttribute("aria-label", online ? "Display online" : "Display offline");
    }
  }));
}

if (typeof window !== "undefined") {
  window.addEventListener("load", refreshPresence);
  window.setInterval(refreshPresence, POLL_MS);
  const observer = new MutationObserver(() => refreshPresence());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
