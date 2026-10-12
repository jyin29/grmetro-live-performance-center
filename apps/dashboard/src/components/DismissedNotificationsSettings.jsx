import { useManagementDismissals } from "../hooks/useManagementDismissals";

export function DismissedNotificationsSettings({ onBack }) {
  const dismissals = useManagementDismissals();
  return <div className="dismissed-notifications-settings">
    <button className="mobile-back" type="button" onClick={onBack}>← Settings</button>
    <div className="settings-title"><span className="mobile-eyebrow">Management attention</span><h2>Dismissed Notifications</h2><p>Restored warnings return immediately if their current fingerprint is still active. Materially changed warnings appear automatically.</p></div>
    {dismissals.error && <div className="operations-alert is-error">Could not update dismissed notifications.</div>}
    {!dismissals.dismissed.length ? <div className="operations-alert">No management notifications are dismissed.</div> : <div className="dismissed-notifications-list">
      {dismissals.dismissed.map((item) => <article key={item.key}><div><small>{item.eyebrow || item.priority}</small><strong>{item.title}</strong><span>{item.detail}</span></div><button type="button" onClick={() => dismissals.restore(item.key)}>Restore</button></article>)}
    </div>}
    {dismissals.dismissed.length > 1 && <button className="dismissed-notifications-reset" type="button" onClick={dismissals.reset}>Restore All Notifications</button>}
  </div>;
}
