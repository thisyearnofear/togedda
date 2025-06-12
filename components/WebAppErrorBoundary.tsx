"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { useAppEnvironment } from "@/contexts/unified-app-context";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class WebAppErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WebApp Error Boundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || <WebAppErrorFallback error={this.state.error} />
      );
    }

    return this.props.children;
  }
}

function WebAppErrorFallback({ error }: { error?: Error }) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="text-6xl mb-4">⚠️</div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-gray-400 text-sm">
            The app encountered an unexpected error. This might be due to a
            network issue or a temporary problem.
          </p>
        </div>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === "development" && error && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-left">
            <h3 className="text-sm font-bold text-red-400 mb-2">
              Error Details:
            </h3>
            <pre className="text-xs text-gray-300 overflow-auto max-h-32">
              {error.message}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleReload}
            className="w-full px-4 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            🔄 Reload App
          </button>

          <button
            onClick={handleGoHome}
            className="w-full px-4 py-3 border border-gray-600 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            🏠 Go to Home
          </button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-2">
          <p>If the problem persists:</p>
          <ul className="space-y-1">
            <li>• Check your internet connection</li>
            <li>• Clear your browser cache</li>
            <li>• Try using a different browser</li>
            <li>• Contact support if needed</li>
          </ul>
        </div>

        {/* Web App Specific Help */}
        <WebAppErrorHelp />
      </div>
    </div>
  );
}

function WebAppErrorHelp() {
  const { mode, isStandalone } = useAppEnvironment();

  if (mode !== "webapp") return null;

  return (
    <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 text-xs">
      <h4 className="font-bold text-blue-300 mb-2">Web App Troubleshooting:</h4>
      <div className="text-blue-200 space-y-1">
        {isStandalone ? (
          <>
            <p>• You&apos;re using the installed app version</p>
            <p>• Try opening in browser if issues persist</p>
            <p>• Check for app updates</p>
          </>
        ) : (
          <>
            <p>• You&apos;re using the browser version</p>
            <p>• Consider installing the app for better performance</p>
            <p>• Enable JavaScript if disabled</p>
          </>
        )}
      </div>
    </div>
  );
}

// Main component that uses the error boundary
export default function WebAppErrorBoundary({ children, fallback }: Props) {
  return (
    <WebAppErrorBoundaryClass fallback={fallback}>
      {children}
    </WebAppErrorBoundaryClass>
  );
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    console.error(`[${context || "WebApp"}] Error:`, error);

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { context });
    }
  };

  return { reportError };
}
