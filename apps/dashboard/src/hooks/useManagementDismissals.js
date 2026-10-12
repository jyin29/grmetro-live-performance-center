import { useCallback, useEffect, useMemo, useState } from "react";
import { dismissManagementNotification, fetchNotificationDismissals, resetManagementNotificationDismissals, restoreManagementNotification } from "../api/managementApi";
import { managementNotificationKey } from "../lib/managementNotifications";

const POLL_MS = 15_000;
export function useManagementDismissals() {
  const [state, setState] = useState({ dismissed: [], error: null, loaded: false });
  const load = useCallback(() => fetchNotificationDismissals(), []);
  useEffect(() => {
    let active = true;
    const refresh = () => load()
      .then(({ dismissed = [] }) => active && setState({ dismissed, error: null, loaded: true }))
      .catch((error) => active && setState((current) => ({ ...current, error, loaded: true })));
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [load]);
  const dismiss = useCallback(async (notification) => {
    const key = managementNotificationKey(notification);
    setState((current) => current.dismissed.some((item) => item.key === key) ? current : { ...current, dismissed: [...current.dismissed, { key, ...notification, dismissedAt: new Date().toISOString() }] });
    try { const result = await dismissManagementNotification(key, notification); setState({ dismissed: result.dismissed || [], error: null, loaded: true }); }
    catch (error) {
      const { dismissed = [] } = await load().catch(() => ({ dismissed: [] }));
      setState({ dismissed, error, loaded: true });
      throw error;
    }
  }, [load]);
  const restore = useCallback(async (key) => { const result = await restoreManagementNotification(key); setState({ dismissed: result.dismissed || [], error: null, loaded: true }); }, []);
  const reset = useCallback(async () => { const result = await resetManagementNotificationDismissals(); setState({ dismissed: result.dismissed || [], error: null, loaded: true }); }, []);
  const dismissedKeys = useMemo(() => new Set(state.dismissed.map(({ key }) => key)), [state.dismissed]);
  return { ...state, dismissedKeys, dismiss, restore, reset, reload: load };
}
