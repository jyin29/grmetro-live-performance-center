export function Sparkline({ points, label = "Historical trend" }) {
  const values = Array.isArray(points) ? points.filter(Number.isFinite) : [];
  if (values.length < 2) return null;
  const minimum = Math.min(...values);
  const range = Math.max(1, Math.max(...values) - minimum);
  const coordinates = values.map((value, index) => `${(index / (values.length - 1)) * 100},${26 - ((value - minimum) / range) * 22}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 100 30" role="img" aria-label={label} preserveAspectRatio="none">
    <polyline points={coordinates} vectorEffect="non-scaling-stroke" />
  </svg>;
}
