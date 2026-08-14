const GROUP_SELECTOR = ".operations-tabs,.display-picker,.operations-slide-buttons,.dashboard-period-toggle";
const ACTIVE_SELECTOR = ":scope > button.is-selected,:scope > button.is-active,:scope > button[aria-current='page'],:scope > button[aria-pressed='true']";

let scheduledFrame = 0;
let resizeObserver;
let mutationObserver;

function neutralizeDisplayButtonSelection(group, active) {
  if (!group.classList.contains("display-picker")) return;

  // The legacy .is-selected button styling changes immediately when React
  // switches displays. That creates a second, snapping "highlight" while the
  // measured ::before indicator is still sliding. Make every display button
  // visually neutral so the moving indicator is the one and only highlight.
  const buttons = [...group.querySelectorAll(":scope > button")];
  const inactive = buttons.find((button) => button !== active);
  if (!inactive) return;

  const neutral = getComputedStyle(inactive);
  for (const button of buttons) {
    button.style.setProperty("background", "transparent", "important");
    button.style.setProperty("box-shadow", "none", "important");
    button.style.setProperty("border-color", neutral.borderColor, "important");
  }
}

function updateGroup(group) {
  const active = group.querySelector(ACTIVE_SELECTOR);
  if (!active) {
    group.classList.remove("has-measured-highlight");
    return;
  }

  neutralizeDisplayButtonSelection(group, active);

  // Keep the selector row stationary and move only one visual highlight.
  const groupRect = group.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const x = activeRect.left - groupRect.left;
  const y = activeRect.top - groupRect.top;

  group.style.setProperty("--highlight-x", `${x}px`);
  group.style.setProperty("--highlight-y", `${y}px`);
  group.style.setProperty("--highlight-width", `${activeRect.width}px`);
  group.style.setProperty("--highlight-height", `${activeRect.height}px`);
  group.classList.add("has-measured-highlight");
}

function syncAll() {
  document.querySelectorAll(GROUP_SELECTOR).forEach((group) => {
    updateGroup(group);
    resizeObserver?.observe(group);
    group.querySelectorAll(":scope > button").forEach((button) => resizeObserver?.observe(button));
  });
}

function scheduleSync() {
  if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
  scheduledFrame = requestAnimationFrame(() => {
    scheduledFrame = 0;
    syncAll();
  });
}

function startMeasuredHighlights() {
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(scheduleSync);
  }

  mutationObserver = new MutationObserver(scheduleSync);
  mutationObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "aria-current", "aria-pressed"],
  });

  document.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
  syncAll();
  requestAnimationFrame(scheduleSync);
  document.fonts?.ready?.then(scheduleSync).catch(() => {});
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startMeasuredHighlights, { once: true });
} else {
  startMeasuredHighlights();
}
