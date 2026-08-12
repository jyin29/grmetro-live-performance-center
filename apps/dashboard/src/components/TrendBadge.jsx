import { TrendIndicator } from "./TrendIndicator";

export function TrendBadge(props) {
  return <span className="trend-badge"><TrendIndicator compact {...props} /></span>;
}
