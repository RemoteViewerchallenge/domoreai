import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Only log error, don't destroy entire UI state
    // this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-zinc-950 text-red-500 h-full w-full overflow-auto font-mono">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <div className="bg-zinc-900 p-4 rounded border border-red-900 mb-4">
            <h2 className="text-lg font-bold text-red-400 mb-2">Error:</h2>
            <pre className="whitespace-pre-wrap text-sm">
              {this.state.error?.toString()}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div className="bg-zinc-900 p-4 rounded border border-zinc-800">
              <h2 className="text-lg font-bold text-[var(--color-text-secondary)] mb-2">
                Component Stack:
              </h2>
              <pre className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
