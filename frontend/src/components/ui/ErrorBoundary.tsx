import { Component, ReactNode, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-6">
              An unexpected error occurred. Please try again or contact support if the issue persists.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/dashboard';
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
