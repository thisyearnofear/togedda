"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl mb-2 font-bold">Something went wrong!</h1>
          </div>

          {/* Error Message */}
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              We encountered an unexpected error. Don&apos;t worry, it&apos;s not your fault!
            </p>
            
            {process.env.NODE_ENV === "development" && (
              <div className="text-left bg-gray-900 p-4 rounded-lg mb-4 text-sm">
                <p className="text-red-400 font-mono">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-gray-500 text-xs mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = "/"}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Go Home
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              If this problem persists, please try refreshing the page or contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}