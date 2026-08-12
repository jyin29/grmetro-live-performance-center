import { Component } from "react";

export class DisplayErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.recoveryTimer = window.setTimeout(() => window.location.reload(), 5_000); }
  componentWillUnmount() { window.clearTimeout(this.recoveryTimer); }
  render() {
    if (this.state.failed) return <main className="render-recovery" role="alert"><h1>Restoring display…</h1><p>The presentation encountered an unexpected error and will recover automatically.</p></main>;
    return this.props.children;
  }
}
