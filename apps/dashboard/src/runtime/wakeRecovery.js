export function attachWakeRecovery({ documentRef = document, windowRef = window, recover }) {
  const onVisibility = () => { if (!documentRef.hidden) recover("visibility"); };
  const onOnline = () => recover("online");
  const onPageShow = () => recover("pageshow");
  documentRef.addEventListener("visibilitychange", onVisibility);
  windowRef.addEventListener("online", onOnline);
  windowRef.addEventListener("pageshow", onPageShow);
  return () => {
    documentRef.removeEventListener("visibilitychange", onVisibility);
    windowRef.removeEventListener("online", onOnline);
    windowRef.removeEventListener("pageshow", onPageShow);
  };
}
