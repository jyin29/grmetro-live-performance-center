const GROUP_SELECTOR = ".operations-tabs,.display-picker,.operations-slide-buttons,.dashboard-period-toggle";
const ACTIVE_SELECTOR = ":scope > button.is-selected,:scope > button.is-active,:scope > button[aria-current='page'],:scope > button[aria-pressed='true']";

let scheduledFrame = 0;
let resizeObserver;
let mutationObserver;

function neutralizeDisplayButtonSelection(group, active) {
  if (!group.classList.contains("display-picker")) return;
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

function layoutRect(group, button) {
  const groupRect = group.getBoundingClientRect();
  const rect = button.getBoundingClientRect();
  // Preserve the button press-scale UI, but measure its normal layout box.
  // A centered scale changes the rendered edges, so expand back to offset size.
  const width = button.offsetWidth || rect.width;
  const height = button.offsetHeight || rect.height;
  return {
    x: rect.left - groupRect.left - (width - rect.width) / 2,
    y: rect.top - groupRect.top - (height - rect.height) / 2,
    width,
    height,
  };
}

function updateDisplayPicker(group, active) {
  neutralizeDisplayButtonSelection(group, active);
  let indicator = group.querySelector(":scope > .display-picker__sliding-highlight");
  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "display-picker__sliding-highlight";
    indicator.setAttribute("aria-hidden", "true");
    group.prepend(indicator);
  }

  const next = layoutRect(group, active);
  const previous = indicator.__geometry;
  indicator.__geometry = next;

  if (!previous) {
    Object.assign(indicator.style, { left:`${next.x}px`, top:`${next.y}px`, width:`${next.width}px`, height:`${next.height}px` });
    indicator.classList.add("is-ready");
    return;
  }

  indicator.getAnimations().forEach((animation) => animation.cancel());
  Object.assign(indicator.style, { left:`${next.x}px`, top:`${next.y}px`, width:`${next.width}px`, height:`${next.height}px` });

  if (Math.abs(previous.x-next.x) < .25 && Math.abs(previous.y-next.y) < .25 && Math.abs(previous.width-next.width) < .25 && Math.abs(previous.height-next.height) < .25) return;

  indicator.animate([
    { left:`${previous.x}px`, top:`${previous.y}px`, width:`${previous.width}px`, height:`${previous.height}px` },
    { left:`${next.x}px`, top:`${next.y}px`, width:`${next.width}px`, height:`${next.height}px` },
  ], { duration:320, easing:"cubic-bezier(.22,1,.36,1)" });
}

function updateGroup(group) {
  const active = group.querySelector(ACTIVE_SELECTOR);
  if (!active) {
    group.classList.remove("has-measured-highlight");
    return;
  }

  if (group.classList.contains("display-picker")) {
    updateDisplayPicker(group, active);
    group.classList.add("has-measured-highlight");
    return;
  }

  const groupRect = group.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  group.style.setProperty("--highlight-x", `${activeRect.left-groupRect.left}px`);
  group.style.setProperty("--highlight-y", `${activeRect.top-groupRect.top}px`);
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
function scheduleSync() { if (scheduledFrame) cancelAnimationFrame(scheduledFrame); scheduledFrame=requestAnimationFrame(()=>{scheduledFrame=0;syncAll();}); }
function startMeasuredHighlights() {
  if (typeof ResizeObserver !== "undefined") resizeObserver=new ResizeObserver(scheduleSync);
  mutationObserver=new MutationObserver(scheduleSync);
  mutationObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","aria-current","aria-pressed"]});
  document.addEventListener("scroll",scheduleSync,{passive:true,capture:true});
  window.addEventListener("resize",scheduleSync,{passive:true});
  syncAll(); requestAnimationFrame(scheduleSync); document.fonts?.ready?.then(scheduleSync).catch(()=>{});
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",startMeasuredHighlights,{once:true}); else startMeasuredHighlights();
