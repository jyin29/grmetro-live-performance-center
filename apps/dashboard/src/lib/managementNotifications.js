export function managementNotificationKey(notification = {}) {
  const identity = [notification.id, notification.ruleId, notification.priority, notification.eyebrow, notification.title, notification.detail]
    .map((value) => String(value ?? "").trim()).join("\u001f");
  let hash = 0x811c9dc5;
  for (let index = 0; index < identity.length; index += 1) { hash ^= identity.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return `notice-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function visibleManagementNotifications(insights = [], dismissedKeys = new Set()) {
  return insights.filter((insight) => !dismissedKeys.has(managementNotificationKey(insight)));
}
