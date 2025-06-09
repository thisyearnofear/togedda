"use client";

import { useState, useEffect } from "react";
import { useAppMode } from "@/contexts/app-mode-context";

export default function OfflineIndicator() {
  const { mode } = useAppMode();
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      
      // Auto-hide offline message after 5 seconds
      setTimeout(() => {
        setShowOfflineMessage(false);
      }, 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything if online
  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <>
      {/* Persistent offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-1 text-xs">
          <div className="flex items-center justify-center space-x-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span>You&apos;re offline - Some features may be limited</span>
          </div>
        </div>
      )}

      {/* Offline notification toast */}
      {showOfflineMessage && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-xl">📡</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-1">
                  Connection Lost
                </h3>
                <p className="text-xs text-red-200 mb-2">
                  You&apos;re now offline. Cached data will be used when possible.
                </p>
                <div className="text-xs text-red-300">
                  {mode === "webapp" ? (
                    "Install the app for better offline support"
                  ) : (
                    "Some features may be limited until connection is restored"
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowOfflineMessage(false)}
                className="flex-shrink-0 text-red-300 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back online notification */}
      {isOnline && showOfflineMessage && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-green-900 border border-green-600 rounded-lg p-4 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-xl">✅</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-1">
                  Back Online
                </h3>
                <p className="text-xs text-green-200">
                  Connection restored. All features are now available.
                </p>
              </div>
              <button
                onClick={() => setShowOfflineMessage(false)}
                className="flex-shrink-0 text-green-300 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for checking online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
