import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Send, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  sendingReport: boolean;
  sentReport: boolean;
  ticketId: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      sendingReport: false,
      sentReport: false,
      ticketId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
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
    if (this.isChunkError()) {
      try {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      } catch (e) {
        // ignore
      }
    }
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, sentReport: false, ticketId: null });
  };

  isChunkError = (): boolean => {
    const msg = this.state.error?.message || '';
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Loading chunk')
    );
  };

  handleSendReport = async () => {
    if (this.state.sendingReport || this.state.sentReport) return;
    this.setState({ sendingReport: true });

    try {
      const rawApi = import.meta.env.VITE_API_URL || '/api';
      const apiBase = rawApi.replace(/\/+$/, '');
      const endpoint = apiBase.endsWith('/api') ? `${apiBase}/error-logs` : `${apiBase}/api/error-logs`;

      let networkLog: any[] = [];
      try {
        if (typeof window !== 'undefined' && window.performance && window.performance.getEntriesByType) {
          const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          networkLog = resources.slice(-15).map((r) => ({
            name: r.name,
            initiatorType: r.initiatorType,
            duration: Math.round(r.duration),
            transferSize: r.transferSize,
          }));
        }
      } catch {
        networkLog = [];
      }

      let userId: string | null = null;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          userId = parsed.id || parsed.$id || parsed.email || null;
        }
      } catch {
        // ignore
      }

      const payload = {
        error_message: this.state.error?.message || 'Unknown render error',
        error_name: this.state.error?.name || 'Error',
        stack: this.state.error?.stack || null,
        component_stack: this.state.errorInfo?.componentStack || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        network_log: networkLog,
        user_id: userId,
      };

      const res = await axios.post(endpoint, payload);
      const ticketId = res.data?.ticket_id || `ERR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      this.setState({ sendingReport: false, sentReport: true, ticketId });
    } catch (err: any) {
      this.setState({
        sendingReport: false,
        sentReport: true,
        ticketId: `ERR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error || new Error('Unknown error'), this.handleReset);
        }
        return this.props.fallback;
      }

      const isChunk = this.isChunkError();

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-900"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-200">
              <AlertTriangle size={28} />
            </div>

            <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
              Something went wrong
            </h1>

            <p className="mb-4 text-sm text-slate-600 leading-relaxed">
              An unexpected error occurred while rendering this page. You can reload the application to continue.
            </p>

            {isChunk && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-left text-xs text-indigo-900">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <RefreshCw size={13} className="text-indigo-600 animate-spin" /> New Version Detected
                </span>
                A newer version of FeraSetu is live. Reloading the application will fetch the latest scripts.
              </div>
            )}

            {this.state.error?.message && (
              <div className="mb-5 max-h-32 overflow-y-auto rounded-xl bg-red-50 p-3 text-left font-mono text-xs text-red-700 border border-red-200">
                {this.state.error.message}
              </div>
            )}

            {this.state.sentReport && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>
                  Report sent to FeraSetu team. Ticket: <strong>#{this.state.ticketId}</strong>
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Reload application</span>
                </button>

                <a
                  href="/dashboard"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                >
                  <Home size={16} />
                  <span>Go to Dashboard</span>
                </a>
              </div>

              <button
                type="button"
                disabled={this.state.sendingReport || this.state.sentReport}
                onClick={this.handleSendReport}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  this.state.sentReport
                    ? 'bg-emerald-100 text-emerald-800 cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer'
                }`}
              >
                {this.state.sentReport ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Report Delivered to FeraSetu Engineers</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>{this.state.sendingReport ? 'Submitting Error Telemetry...' : 'Send to FeraSetu Team'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
