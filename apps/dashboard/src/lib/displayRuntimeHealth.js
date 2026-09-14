export function formatDisplayUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Unavailable";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatHeartbeatAge(value, now = Date.now()) {
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return "Unavailable";
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

export function formatMemoryHealth(runtimeHealth) {
  if (!Number.isFinite(runtimeHealth?.memoryPercent)) return "Not reported";
  const suffix = runtimeHealth.memoryPressure ? " · pressure" : "";
  return `${runtimeHealth.memoryPercent}%${suffix}`;
}

export function formatRecoveryReason(value) {
  if (typeof value !== "string" || !value.trim()) return "None";
  return value.trim().replaceAll("-", " ");
}

export function shortSessionId(value) {
  if (typeof value !== "string" || !value) return "Unavailable";
  return value.length > 12 ? `…${value.slice(-12)}` : value;
}
