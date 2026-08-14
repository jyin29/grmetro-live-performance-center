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

  // Measure in the group's actual rendered coordinate system. offsetLeft is
  // relative to offsetParent, which is not guaranteed to be this group and
  // becomes visibly wrong for scrollable/flex containers.
  const groupRect = group.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const x = activeRect.left - groupRect.left;

  group.style.setProperty("--highlight-x", `${x}px`);
  group.style.setProperty("--highlight-width", `${activeRect.width}px`);
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

  // Scrollable display/tab rows change the selected button's visual position
  // without changing its offsetLeft, so remeasure on scroll as well.
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
