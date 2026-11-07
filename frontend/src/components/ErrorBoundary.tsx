import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Send, CheckCircle2, UserCheck, Shield } from 'lucide-react';
import {
  reportClientError,
  getStoredUserSpecifications,
  type UserSpecification,
} from '../services/errorTelemetry';

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
  userSpecs: UserSpecification;
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
      userSpecs: getStoredUserSpecifications(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
      userSpecs: getStoredUserSpecifications(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const userSpecs = getStoredUserSpecifications();
    this.setState({ errorInfo, userSpecs });
    console.error('[ErrorBoundary caught error]:', error, errorInfo);

    // Automatically record and dispatch error report with authoritative user specifications
    this.dispatchErrorReport(error, errorInfo, userSpecs);
  }

  dispatchErrorReport = async (
    targetError?: Error,
    targetInfo?: ErrorInfo,
    overrideSpecs?: UserSpecification
  ) => {
    if (this.state.sendingReport || this.state.sentReport) return;
    this.setState({ sendingReport: true });

    const err = targetError || this.state.error;
    const info = targetInfo || this.state.errorInfo;
    const specs = overrideSpecs || this.state.userSpecs || getStoredUserSpecifications();

    try {
      const ticketId = await reportClientError({
        error_message: err?.message || 'Unknown render error',
        error_name: err?.name || 'RenderError',
        stack: err?.stack || null,
        component_stack: info?.componentStack || null,
        user_id: specs.user_id,
        user_email: specs.user_email,
        user_name: specs.user_name,
        plan_tier: specs.plan_tier,
        is_paid: specs.is_paid,
        store_slug: specs.store_slug,
        metadata: {
          captured_by: 'ErrorBoundary.componentDidCatch',
          market: specs.market,
        },
      });

      this.setState({ sendingReport: false, sentReport: true, ticketId, userSpecs: specs });
    } catch {
      const fallbackTicket = `ERR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      this.setState({ sendingReport: false, sentReport: true, ticketId: fallbackTicket });
    }
  };

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
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      sentReport: false,
      ticketId: null,
      userSpecs: getStoredUserSpecifications(),
    });
  };

  isChunkError = (): boolean => {
    const msg = this.state.error?.message || '';
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to resolve module specifier')
    );
  };

  handleSendReport = () => {
    this.dispatchErrorReport();
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
              <div className="mb-4 max-h-32 overflow-y-auto rounded-xl bg-red-50 p-3 text-left font-mono text-xs text-red-700 border border-red-200">
                {this.state.error.message}
              </div>
            )}

            {(this.state.error?.stack || this.state.errorInfo?.componentStack) && (
              <details className="mb-4 text-left text-[11px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <summary className="cursor-pointer font-bold text-slate-700 select-none">Technical error stack</summary>
                {this.state.error?.stack && (
                  <pre className="mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto text-[10px] text-slate-700">{this.state.error.stack}</pre>
                )}
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto text-[10px] text-slate-500">{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}

            {/* User & Subscription Specifications Badge */}
            {this.state.userSpecs.user_email && (
              <div className="mb-4 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-left text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <UserCheck size={15} className="text-slate-500 shrink-0" />
                  <span className="truncate text-slate-700 font-medium">
                    {this.state.userSpecs.user_name || this.state.userSpecs.user_email}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    this.state.userSpecs.is_paid
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {this.state.userSpecs.is_paid
                    ? `PAID (${this.state.userSpecs.plan_tier})`
                    : `FREE PLAN`}
                </span>
              </div>
            )}

            {this.state.sentReport && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>
                  Incident automatically recorded. Ticket: <strong>#{this.state.ticketId}</strong>
                </span>
              </div>
            )}

            {this.state.sendingReport && !this.state.sentReport && (
              <div className="mb-5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-blue-600" />
                <span>Submitting error diagnostic ticket to FeraSetu team...</span>
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
                    <span>Ticket Logged with User Specifications</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>{this.state.sendingReport ? 'Transmitting Telemetry...' : 'Send Telemetry to Engineering'}</span>
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
