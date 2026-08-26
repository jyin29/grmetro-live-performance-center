import { DEFAULT_DISPLAY_ID, PRESENTATION_DISPLAYS } from "./config/displayRegistry";

function isRemotePage() {
  return window.location.pathname.replace(/\/+$/, "") === "/remote";
}

function selectedDisplayId() {
  const selected = document.querySelector('.display-picker button[aria-pressed="true"], .display-picker button.is-selected');
  const name = selected?.querySelector("strong")?.textContent?.trim();
  return PRESENTATION_DISPLAYS.find((display) => display.name === name)?.id || DEFAULT_DISPLAY_ID;
}

function activeSlideIndex() {
  const buttons = [...document.querySelectorAll(".operations-slide-buttons button")];
  const index = buttons.findIndex((button) => button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true");
  return index >= 0 ? index : 0;
}

function commandForButton(button) {
  if (!button) return null;
  if (button.closest(".operations-slide-buttons")) {
    const buttons = [...document.querySelectorAll(".operations-slide-buttons button")];
    const index = buttons.indexOf(button);
    return index >= 0 ? { action: "select", index } : null;
  }
  const text = button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
  if (text.includes("previous")) return { action: "select", index: (activeSlideIndex() + 5) % 6 };
  if (text.includes("next")) return { action: "select", index: (activeSlideIndex() + 1) % 6 };
  if (text.includes("pause")) return { action: "pause" };
  if (text.includes("resume")) return { action: "resume" };
  if (text.includes("restart")) return { action: "restart" };
  return null;
}

function ensureSink() {
  let sink = document.getElementById("ultimate-remote-command-sink");
  if (sink) return sink;
  sink = document.createElement("iframe");
  sink.id = "ultimate-remote-command-sink";
  sink.name = "ultimate-remote-command-sink";
  sink.setAttribute("aria-hidden", "true");
  sink.tabIndex = -1;
  sink.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(sink);
  return sink;
}

let lastSignature = "";
let lastAt = 0;
function issue(command) {
  const displayId = selectedDisplayId();
  const signature = `${displayId}:${command.action}:${command.index ?? ""}`;
  const now = Date.now();
  if (signature === lastSignature && now - lastAt < 700) return;
  lastSignature = signature;
  lastAt = now;

  const index = Number.isInteger(command.index) ? `&index=${command.index}` : "";
  const url = `/api/v1/presentation/${encodeURIComponent(displayId)}/action/${encodeURIComponent(command.action)}?_=${now}${index}`;

  // Deliberately use three independent browser delivery mechanisms. All remote slide
  // movement is converted to absolute `select` commands, so duplicate delivery is safe.
  // If mobile fetch, WebSocket, or a single browser event path is flaky, one of these
  // still reaches the same-origin backend presentation manager.
  ensureSink().src = url;
  const image = new Image();
  image.src = `${url}&transport=image`;
  fetch(`${url}&transport=fetch`, { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});

  window.dispatchEvent(new CustomEvent("grmetro:remote-command-issued", { detail: { displayId, ...command, at: now } }));
}

function handle(event) {
  if (!isRemotePage()) return;
  const button = event.target?.closest?.(".operations-display-actions button");
  if (!button || button.disabled) return;
  const command = commandForButton(button);
  if (!command) return;
  event.preventDefault?.();
  event.stopImmediatePropagation?.();
  issue(command);
}

if (typeof window !== "undefined" && isRemotePage()) {
  document.addEventListener("pointerup", handle, true);
  document.addEventListener("touchend", handle, true);
  document.addEventListener("click", handle, true);
}
