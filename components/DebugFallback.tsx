"use client";

import { useEffect, useState } from "react";

interface DebugFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export default function DebugFallback({ error, resetError }: DebugFallbackProps) {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDebugInfo({
        userAgent: navigator.userAgent,
        url: window.location.href,
        hasParent: window.parent !== window,
        ethereum: !!window.ethereum,
        MiniKit: !!(window as any).MiniKit,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">🔧 Debug Mode</h1>
          <p className="text-gray-400">
            The app encountered an issue during initialization. Here&apos;s the debug information:
          </p>
        </div>

        {/* Error Information */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-bold text-red-300 mb-2">Error Details</h2>
            <div className="space-y-2">
              <div>
                <span className="text-red-400 font-medium">Message:</span>
                <span className="ml-2 text-red-200">{error.message}</span>
              </div>
              <div>
                <span className="text-red-400 font-medium">Stack:</span>
                <pre className="mt-1 text-xs text-red-200 bg-red-900/30 p-2 rounded overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Environment Information */}
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-300 mb-2">Environment</h2>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-400">URL:</span>
              <span className="ml-2 text-gray-200">{debugInfo.url}</span>
            </div>
            <div>
              <span className="text-gray-400">Has Parent:</span>
              <span className="ml-2 text-gray-200">{debugInfo.hasParent ? "Yes" : "No"}</span>
            </div>
            <div>
              <span className="text-gray-400">Ethereum:</span>
              <span className="ml-2 text-gray-200">{debugInfo.ethereum ? "Available" : "Not Available"}</span>
            </div>
            <div>
              <span className="text-gray-400">MiniKit:</span>
              <span className="ml-2 text-gray-200">{debugInfo.MiniKit ? "Available" : "Not Available"}</span>
            </div>
            <div>
              <span className="text-gray-400">User Agent:</span>
              <span className="ml-2 text-gray-200 text-xs break-all">{debugInfo.userAgent}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            🔄 Reload Page
          </button>
          
          {resetError && (
            <button
              onClick={resetError}
              className="w-full px-4 py-3 border border-gray-600 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              🔧 Try Again
            </button>
          )}
          
          <button
            onClick={() => {
              const debugData = {
                error: error?.message,
                stack: error?.stack,
                ...debugInfo,
              };
              navigator.clipboard?.writeText(JSON.stringify(debugData, null, 2));
              alert("Debug info copied to clipboard!");
            }}
            className="w-full px-4 py-3 border border-blue-600 text-blue-300 rounded-lg hover:bg-blue-900/20 transition-colors"
          >
            📋 Copy Debug Info
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>If this issue persists, please share the debug information above.</p>
        </div>
      </div>
    </div>
  );
}
