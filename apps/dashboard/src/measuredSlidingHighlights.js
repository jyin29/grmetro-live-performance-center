const GROUP_SELECTOR = ".operations-tabs,.display-picker,.operations-slide-buttons,.dashboard-period-toggle";
const ACTIVE_SELECTOR = ":scope > button.is-selected,:scope > button.is-active,:scope > button[aria-current='page'],:scope > button[aria-pressed='true']";

let scheduledFrame = 0;
let resizeObserver;
let mutationObserver;
let lastDisplaySelection = null;

function centerDisplaySelection(group, active) {
  if (!group.classList.contains("display-picker")) return;
  if (active === lastDisplaySelection) return;
  lastDisplaySelection = active;

  const maxScroll = group.scrollWidth - group.clientWidth;
  if (maxScroll <= 0) return;

  const target = Math.max(
    0,
    Math.min(maxScroll, active.offsetLeft + active.offsetWidth / 2 - group.clientWidth / 2),
  );

  group.scrollTo({ left: target, behavior: "smooth" });
}

function updateGroup(group) {
  const active = group.querySelector(ACTIVE_SELECTOR);
  if (!active) {
    group.classList.remove("has-measured-highlight");
    return;
  }

  centerDisplaySelection(group, active);

  // Always measure the highlight from the rendered rectangles. During the
  // display picker's smooth scroll, scroll events repeatedly call this method,
  // keeping the highlight locked to the selected button while the row moves.
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
