import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error || new Error('Unknown error'), this.handleReset);
        }
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-900"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-200">
              <AlertTriangle size={28} />
            </div>

            <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
              Something went wrong
            </h1>

            <p className="mb-6 text-sm text-slate-600 leading-relaxed">
              An unexpected error occurred while rendering this page. You can reload the application to continue.
            </p>

            {this.state.error?.message && (
              <div className="mb-6 max-h-28 overflow-y-auto rounded-xl bg-red-50 p-3 text-left font-mono text-xs text-red-700 border border-red-200">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Reload application</span>
              </button>

              <a
                href="/dashboard"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              >
                <Home size={16} />
                <span>Go to Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
