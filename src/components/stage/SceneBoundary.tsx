import { Component, type ReactNode } from "react";

interface SceneBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  /** When this value changes, a failed scene gets another chance without remounting a healthy one. */
  resetKey?: unknown;
}
interface SceneBoundaryState {
  failed: boolean;
  resetKey: unknown;
}

export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false, resetKey: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(props: SceneBoundaryProps, state: SceneBoundaryState) {
    if (props.resetKey === state.resetKey) return null;
    return { failed: false, resetKey: props.resetKey };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
