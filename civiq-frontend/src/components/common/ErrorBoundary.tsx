import { Component, ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { err: unknown }> {
  state = { err: null as unknown };
  static getDerivedStateFromError(err: unknown) { return { err }; }
  render() {
    if (this.state.err) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-10 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <p className="font-semibold text-red-900 dark:text-red-200">Something failed to render</p>
          <p className="text-sm text-red-700 dark:text-red-300/80">Reload the page or switch view.</p>
          <button className="rounded-lg border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-800 dark:border-red-500/40 dark:bg-transparent dark:text-red-200" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
