const LOGO_TAP_COUNT = 7;
const LOGO_TAP_WINDOW_MS = 5000;
const CELEBRATION_MS = 6500;
const REFRESH_TAP_COUNT = 15;
const REFRESH_TAP_WINDOW_MS = 30000;
const REFRESH_MESSAGE_MS = 4200;
let logoTaps = [];
let refreshTaps = [];
let active = false;
let refreshMessageActive = false;

function isLogoTarget(target) {
  if (!(target instanceof Element)) return false;
  const image = target.closest("img");
  if (!image) return false;
  const text = `${image.alt || ""} ${image.src || ""}`.toLowerCase();
  return text.includes("grmetro") || text.includes("grmetro-logo");
}
function isRefreshTarget(target) { return target instanceof Element ? target.closest(".refresh-dashboard-button") : null; }
function celebrate() {
  if (active) return; active = true;
  const layer = document.createElement("div"); layer.className = "boss-easter-egg boss-easter-egg--deluxe"; layer.setAttribute("aria-hidden", "true");
  const particles = Array.from({ length: 28 }, (_, index) => `<i style="--i:${index};--x:${((index * 37) % 100) - 50};--delay:${(index % 9) * 0.07}s">${index % 4 === 0 ? "★" : index % 3 === 0 ? "✦" : "✧"}</i>`).join("");
  layer.innerHTML = `<div class="boss-easter-egg__aurora"></div><div class="boss-easter-egg__rings"><span></span><span></span><span></span></div><div class="boss-easter-egg__particles">${particles}</div><div class="boss-easter-egg__message"><small>GRMETRO</small><strong>WELL, YOU FOUND IT.</strong><span>Management has been notified.</span><em>(probably)</em></div><div class="boss-easter-egg__sweep"></div>`;
  document.body.appendChild(layer); window.setTimeout(() => layer.classList.add("is-leaving"), CELEBRATION_MS - 700); window.setTimeout(() => { layer.remove(); active = false; }, CELEBRATION_MS);
}
function showRefreshMessage() {
  if (refreshMessageActive) return; refreshMessageActive = true;
  const toast = document.createElement("div"); toast.className = "refresh-easter-egg"; toast.setAttribute("role", "status"); toast.innerHTML = '<span>↻</span><div><strong>Why are you spamming me? 😭</strong><small>I promise I heard you the first time.</small></div>';
  document.body.appendChild(toast); requestAnimationFrame(() => toast.classList.add("is-visible")); window.setTimeout(() => toast.classList.remove("is-visible"), REFRESH_MESSAGE_MS - 500); window.setTimeout(() => { toast.remove(); refreshMessageActive = false; }, REFRESH_MESSAGE_MS);
}

// Count refresh-button clicks in capture phase. The first click in a burst is a real
// refresh; repeated clicks are counted for the easter egg but are intentionally
// swallowed so they cannot hammer the backend or consume the management rate limit.
document.addEventListener("click", (event) => {
  const button = isRefreshTarget(event.target);
  if (!button) return;
  const now = Date.now();
  refreshTaps = refreshTaps.filter((time) => now - time < REFRESH_TAP_WINDOW_MS);
  const isRepeatedTap = refreshTaps.length > 0;
  refreshTaps.push(now);
  if (isRepeatedTap) { event.preventDefault(); event.stopImmediatePropagation(); }
  if (refreshTaps.length >= REFRESH_TAP_COUNT) { refreshTaps = []; showRefreshMessage(); }
}, true);

document.addEventListener("pointerup", (event) => {
  if (!isLogoTarget(event.target)) return;
  const now = Date.now(); logoTaps = logoTaps.filter((time) => now - time < LOGO_TAP_WINDOW_MS); logoTaps.push(now);
  if (logoTaps.length >= LOGO_TAP_COUNT) { logoTaps = []; celebrate(); }
}, { passive: true });
