const GROUP_SELECTOR = ".operations-tabs,.display-picker,.operations-slide-buttons,.dashboard-period-toggle";
const ACTIVE_SELECTOR = ":scope > button.is-selected,:scope > button.is-active,:scope > button[aria-current='page'],:scope > button[aria-pressed='true']";

let scheduledFrame = 0;
let resizeObserver;
let mutationObserver;

function updateGroup(group) {
  const active = group.querySelector(ACTIVE_SELECTOR);
  if (!active) {
    group.classList.remove("has-measured-highlight");
    return;
  }

  group.style.setProperty("--highlight-x", `${active.offsetLeft}px`);
  group.style.setProperty("--highlight-width", `${active.offsetWidth}px`);
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
