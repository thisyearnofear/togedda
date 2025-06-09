"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { AppError, createError, ErrorType, ErrorSeverity, logger } from "@/lib/utils/error-handler";
import { appConfig } from "@/lib/config/app";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  level?: "page" | "component" | "critical";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  errorId?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if this is a wallet extension error that we can ignore
    if (error.message?.includes('Cannot set property ethereum') ||
        error.message?.includes('pageProvider.js') ||
        error.message?.includes('KeyRing is locked')) {
      // These are wallet extension conflicts, not app errors
      console.warn('Wallet extension error caught and ignored:', error.message);
      return { hasError: false };
    }

    const appError = createError({
      error,
      type: ErrorType.CLIENT,
      severity: ErrorSeverity.HIGH,
      code: "REACT_ERROR_BOUNDARY",
    });

    return {
      hasError: true,
      error: appError,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is a wallet extension error that we can ignore
    if (error.message?.includes('Cannot set property ethereum') ||
        error.message?.includes('pageProvider.js') ||
        error.message?.includes('KeyRing is locked')) {
      // These are wallet extension conflicts, not app errors
      console.warn('Wallet extension error caught and ignored:', error.message);
      return;
    }

    const appError = createError({
      error,
      type: ErrorType.CLIENT,
      severity: ErrorSeverity.HIGH,
      code: "REACT_ERROR_BOUNDARY",
      context: {
        componentStack: errorInfo.componentStack,
        level: this.props.level || "component",
        errorId: this.state.errorId,
      },
    });

    // Log the error
    logger.error("React Error Boundary caught error", appError, {
      componentStack: errorInfo.componentStack,
      level: this.props.level,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }

    // Update state with the error
    this.setState({ error: appError });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleRetry = () => {
    // Clear any pending retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset error state
    this.setState({ hasError: false, error: undefined, errorId: undefined });

    // Log retry attempt
    logger.info("Error boundary retry attempted", {
      errorId: this.state.errorId,
      level: this.props.level,
    });
  };

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleReport = () => {
    if (this.state.error && typeof window !== "undefined") {
      const errorReport = {
        error: this.state.error.toJSON(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        level: this.props.level,
      };

      // In a real app, you'd send this to your error reporting service
      logger.error("Error report generated", errorReport);
      
      // For now, copy to clipboard
      navigator.clipboard?.writeText(JSON.stringify(errorReport, null, 2))
        .then(() => {
          alert("Error report copied to clipboard");
        })
        .catch(() => {
          console.log("Error report:", errorReport);
        });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI based on error level
      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          level={this.props.level || "component"}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onReport={this.handleReport}
        />
      );
    }

    return this.props.children;
  }
}

// Default fallback component
interface ErrorFallbackProps {
  error: AppError;
  errorId?: string;
  level: "page" | "component" | "critical";
  onRetry: () => void;
  onReload: () => void;
  onReport: () => void;
}

function ErrorFallback({
  error,
  errorId,
  level,
  onRetry,
  onReload,
  onReport,
}: ErrorFallbackProps) {
  const isCritical = level === "critical";
  const isPage = level === "page";

  return (
    <div className={`
      error-boundary-fallback
      ${isCritical ? 'min-h-screen' : isPage ? 'min-h-[50vh]' : 'min-h-[200px]'}
      flex items-center justify-center p-4 bg-black
    `}>
      <div className="game-container max-w-md w-full p-6 text-center">
        {/* Error Icon */}
        <div className="mb-4">
          {isCritical ? (
            <div className="text-6xl">💥</div>
          ) : (
            <div className="text-4xl">⚠️</div>
          )}
        </div>

        {/* Error Title */}
        <h2 className="text-xl mb-3">
          {isCritical ? "Critical Error" : isPage ? "Page Error" : "Something Went Wrong"}
        </h2>

        {/* Error Message */}
        <p className="text-sm text-gray-300 mb-4">
          {error.userMessage || "An unexpected error occurred."}
        </p>

        {/* Error ID for debugging */}
        {appConfig.debug.enabled && errorId && (
          <p className="text-xs text-gray-500 mb-4 font-mono">
            Error ID: {errorId}
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isCritical && (
            <button
              onClick={onRetry}
              className="retro-button w-full"
            >
              Try Again
            </button>
          )}

          <button
            onClick={onReload}
            className="retro-button w-full"
          >
            Reload Page
          </button>

          {appConfig.debug.enabled && (
            <button
              onClick={onReport}
              className="retro-button w-full opacity-75"
            >
              Report Error
            </button>
          )}
        </div>

        {/* Additional Help */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            If this problem persists, please refresh the page or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Specific error boundaries for different use cases
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="page">
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="component">
      {children}
    </ErrorBoundary>
  );
}

export function CriticalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="critical">
      {children}
    </ErrorBoundary>
  );
}

// Hook for manually triggering error boundary
export function useErrorBoundary() {
  return (error: Error | string) => {
    const errorToThrow = typeof error === "string" ? new Error(error) : error;
    throw errorToThrow;
  };
}

export default ErrorBoundary;