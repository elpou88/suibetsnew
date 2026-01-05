import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  errorId: string;
  stack?: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  private readonly maxRetries = 3;
  private readonly retryTimeout = 5000;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `ERR_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
      stack: error.stack
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { errorId } = this.state;
    console.error('🔴 ERROR BOUNDARY CAUGHT:', {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Log to server for monitoring
    this.logErrorToServer(error, errorInfo, errorId);

    // Auto-retry for transient errors
    if (this.shouldAutoRetry(error) && this.state.errorCount < this.maxRetries) {
      setTimeout(() => {
        this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
        this.handleReset();
      }, this.retryTimeout);
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    const transientErrors = [
      'NetworkError',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND'
    ];
    return transientErrors.some(e => error.message.includes(e));
  }

  private logErrorToServer = async (error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      }).catch(() => {
        // Silently fail if server logging fails
        console.warn('Failed to log error to server');
      });
    } catch (err) {
      console.error('Error logging failed:', err);
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorCount, errorId, stack } = this.state;

    if (hasError && error) {
      const isRetrying = errorCount > 0 && errorCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950/40 to-slate-900/60 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gradient-to-br from-blue-950/80 to-slate-900/80 rounded-2xl border-2 border-red-500/50 p-8 backdrop-blur-xl shadow-2xl shadow-red-500/20">
            {/* Error Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
                <AlertTriangle className="h-8 w-8 text-red-400 absolute top-2 right-2 animate-bounce" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {isRetrying ? 'Recovering...' : 'Oops! Something went wrong'}
            </h1>

            {/* Retry Status */}
            {isRetrying && (
              <p className="text-sm text-yellow-300 text-center mb-4 font-semibold">
                Attempting automatic recovery ({errorCount}/{this.maxRetries})
              </p>
            )}

            {/* Error Details */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 max-h-32 overflow-y-auto">
              <p className="text-xs text-red-200 font-mono break-words">
                {error.message || 'An unexpected error occurred'}
              </p>
              {process.env.NODE_ENV === 'development' && stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-300 cursor-pointer hover:text-red-200">
                    Stack trace
                  </summary>
                  <pre className="text-xs text-red-200 mt-2 overflow-x-auto">
                    {stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Error ID */}
            <div className="bg-slate-800/50 rounded-lg p-3 mb-6 border border-slate-700/50">
              <p className="text-xs text-gray-400">Error ID:</p>
              <p className="text-sm text-cyan-300 font-mono font-bold">{errorId}</p>
            </div>

            {/* Message */}
            <p className="text-gray-300 text-center mb-6 text-sm">
              {isRetrying
                ? 'Attempting to restore your session automatically...'
                : 'Our team has been notified. Please try again or return home.'}
            </p>

            {/* Action Buttons */}
            {!isRetrying && (
              <div className="space-y-3">
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 disabled:opacity-50"
                >
                  <Home className="h-5 w-5" />
                  Return to Home
                </button>

                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600/50 hover:bg-blue-600/70 text-white font-bold py-3 px-4 rounded-lg transition-all border border-blue-500/50"
                >
                  <RefreshCw className="h-5 w-5" />
                  Try Again
                </button>

                <button
                  onClick={this.handleReload}
                  className="w-full bg-slate-700/50 hover:bg-slate-700/70 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all text-sm"
                >
                  Reload Page
                </button>
              </div>
            )}

            {isRetrying && (
              <div className="flex justify-center">
                <div className="h-8 w-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Development Mode - Check console for details
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children || this.props.fallback;
  }
}
