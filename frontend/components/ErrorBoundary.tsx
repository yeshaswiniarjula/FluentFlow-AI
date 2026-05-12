'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, send to error monitoring (e.g. Sentry, Datadog)
    console.error('[ErrorBoundary] Uncaught render error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-950 gap-6 px-6 text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center">
            <svg className="w-9 h-9 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-100">Something went wrong</h2>
            <p className="text-gray-400 text-sm max-w-sm">
              Something went wrong. Please refresh the page.
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={this.handleRefresh}
            className="
              px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500
              text-white text-sm font-medium
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-950
            "
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
