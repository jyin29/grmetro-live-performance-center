import { DEFAULT_DISPLAY_ID, PRESENTATION_DISPLAYS } from "./config/displayRegistry";

function isRemotePage() {
  return window.location.pathname.replace(/\/+$/, "") === "/remote";
}

function selectedDisplayId() {
  const selected = document.querySelector('.display-picker button[aria-pressed="true"], .display-picker button.is-selected');
  const name = selected?.querySelector("strong")?.textContent?.trim();
  return PRESENTATION_DISPLAYS.find((display) => display.name === name)?.id || DEFAULT_DISPLAY_ID;
}

function commandForButton(button) {
  if (!button) return null;
  if (button.closest(".operations-slide-buttons")) {
    const buttons = [...document.querySelectorAll(".operations-slide-buttons button")];
    const index = buttons.indexOf(button);
    return index >= 0 ? { action: "select", index } : null;
  }
  const text = button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
  if (text.includes("previous")) return { action: "previous" };
  if (text.includes("next")) return { action: "next" };
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
  // pointerup/touchend/click can all fire for one tap. Permit only one command.
  if (signature === lastSignature && now - lastAt < 700) return;
  lastSignature = signature;
  lastAt = now;
  const index = Number.isInteger(command.index) ? `&index=${command.index}` : "";
  const url = `/api/v1/presentation/${encodeURIComponent(displayId)}/action/${encodeURIComponent(command.action)}?_=${now}${index}`;
  ensureSink().src = url;
  window.dispatchEvent(new CustomEvent("grmetro:remote-command-issued", { detail: { displayId, ...command, at: now } }));
}

function handle(event) {
  if (!isRemotePage()) return;
  const button = event.target?.closest?.(".operations-display-actions button");
  if (!button || button.disabled) return;
  const command = commandForButton(button);
  if (!command) return;
  // Own display-control taps completely. This bypasses React/fetch/WebSocket command
  // delivery while leaving the rest of the remote app untouched.
  event.preventDefault?.();
  event.stopImmediatePropagation?.();
  issue(command);
}

if (typeof window !== "undefined" && isRemotePage()) {
  // Use several mobile event types so iOS/Android quirks cannot silently swallow controls.
  document.addEventListener("pointerup", handle, true);
  document.addEventListener("touchend", handle, true);
  document.addEventListener("click", handle, true);
}
