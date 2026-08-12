export function isFullscreen(documentRef = document) {
  return Boolean(documentRef.fullscreenElement);
}

export async function requestDisplayFullscreen(documentRef = document) {
  if (isFullscreen(documentRef)) return true;
  const request = documentRef.documentElement?.requestFullscreen;
  if (!request) return false;
  try { await request.call(documentRef.documentElement); return true; } catch { return false; }
}

export async function toggleDisplayFullscreen(documentRef = document) {
  if (isFullscreen(documentRef)) { await documentRef.exitFullscreen?.(); return false; }
  return requestDisplayFullscreen(documentRef);
}

export function isFullscreenShortcut(event) {
  return event.key === "F11" || (event.key.toLowerCase() === "f" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey);
}
