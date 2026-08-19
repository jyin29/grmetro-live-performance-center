const TAP_COUNT = 7;
const TAP_WINDOW_MS = 2600;
const RESET_AFTER_MS = 4200;
let taps = [];
let active = false;

function isLogoTarget(target) {
  if (!(target instanceof Element)) return false;
  const image = target.closest("img");
  if (!image) return false;
  const text = `${image.alt || ""} ${image.src || ""}`.toLowerCase();
  return text.includes("grmetro") || text.includes("grmetro-logo");
}

function celebrate() {
  if (active) return;
  active = true;
  const layer = document.createElement("div");
  layer.className = "boss-easter-egg";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = '<div class="boss-easter-egg__burst"><span>✦</span><span>★</span><span>✧</span><span>★</span><span>✦</span><span>✧</span></div><div class="boss-easter-egg__message"><small>GRMETRO</small><strong>LET\'S GO</strong><span>Performance Center</span></div>';
  document.body.appendChild(layer);
  window.setTimeout(() => { layer.remove(); active = false; }, RESET_AFTER_MS);
}

document.addEventListener("pointerup", (event) => {
  if (!isLogoTarget(event.target)) return;
  const now = Date.now();
  taps = taps.filter((time) => now - time < TAP_WINDOW_MS);
  taps.push(now);
  if (taps.length >= TAP_COUNT) {
    taps = [];
    celebrate();
  }
}, { passive: true });
