import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

/** Component-level boundary: a failed chart/panel shows a retry, not a blank app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/15 text-[hsl(var(--destructive))]">!</div>
          <p className="text-[13px] font-semibold">{this.props.label ?? 'This panel hit an error'}</p>
          <p className="max-w-xs text-[11px] text-muted-foreground">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-1 rounded-lg border border-border px-3 py-1 text-[12px] font-medium hover:bg-muted">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
