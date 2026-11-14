import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle, Home } from 'lucide-react';
import { Logo } from './Logo.tsx';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log technical diagnostics securely without exposing sensitive variables
    console.error('AI Workforce UI Exception caught by boundary:', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      try {
        window.location.reload();
      } catch {}
    }
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    try {
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans selection:bg-slate-200 dark:selection:bg-neutral-800">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <Logo size="md" showText={true} />
            </div>

            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-slate-800 dark:text-neutral-200 shadow-2xs">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Something went wrong.
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                An unexpected interface issue occurred. Your company profile, inquiries, and workspace data remain safe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-900 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
