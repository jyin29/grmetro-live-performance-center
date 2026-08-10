export function ErrorView({ message, onRetry }) {
  return <section className="state-view" role="alert"><span className="state-view__icon">!</span><h2>We’re reconnecting to live data</h2><p>{message}</p><button type="button" onClick={onRetry}>Try again</button></section>;
}
