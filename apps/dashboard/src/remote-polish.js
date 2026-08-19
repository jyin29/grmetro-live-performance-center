function addCustomizeShortcut() {
  if (window.location.pathname !== "/remote") return;
  const actions = document.querySelector(".home-quick-actions");
  if (!actions || actions.querySelector("[data-customize-shortcut]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.customizeShortcut = "true";
  button.className = "remote-customize-shortcut";
  button.setAttribute("aria-label", "Customize dashboard");
  button.innerHTML = '<span class="remote-customize-shortcut__icon" aria-hidden="true">⚙</span><span><strong>Customize</strong><small>Metrics & spreadsheet</small></span><b>›</b>';
  button.addEventListener("click", () => { window.location.assign("/customize"); });
  actions.appendChild(button);
}

if (typeof window !== "undefined") {
  const observer = new MutationObserver(addCustomizeShortcut);
  const start = () => {
    addCustomizeShortcut();
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
