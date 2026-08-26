const POLL_MS = 2000;

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("request failed");
  return response.json();
}

async function refreshPresence() {
  if (!window.location.pathname.startsWith("/remote")) return;
  try {
    const admin = await fetchJson("/api/v1/admin");
    const idByName = new Map((admin.displays || []).map((display) => [display.displayName, display.displayId]));
    const buttons = [...document.querySelectorAll(".display-picker button")];
    await Promise.all(buttons.map(async (button) => {
      const name = button.querySelector("strong")?.textContent?.trim();
      const displayId = idByName.get(name);
      let online = false;
      if (displayId) {
        try { online = (await fetchJson(`/api/v1/presentation/${encodeURIComponent(displayId)}`)).online === true; } catch { online = false; }
      }
      button.classList.toggle("is-display-online", online);
      button.classList.toggle("is-display-offline", !online);
      const dot = button.querySelector(".display-dot");
      if (dot) {
        dot.title = online ? "Display online" : "Display offline";
        dot.setAttribute("aria-label", online ? "Display online" : "Display offline");
      }
    }));
  } catch {
    document.querySelectorAll(".display-picker button").forEach((button) => {
      button.classList.remove("is-display-online");
      button.classList.add("is-display-offline");
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", refreshPresence);
  window.setInterval(refreshPresence, POLL_MS);
}
