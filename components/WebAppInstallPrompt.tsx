"use client";

import { useState, useEffect } from "react";
import { useAppEnvironment } from "@/contexts/unified-app-context";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function WebAppInstallPrompt() {
  const { mode, isStandalone } = useAppEnvironment();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      setHasBeenDismissed(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);

      // Show prompt after a delay if not dismissed and not in mini app
      if (!dismissed && mode === "webapp" && !isStandalone) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 5000); // Show after 5 seconds
      }
    };

    // Listen for successful app installation
    const handleAppInstalled = () => {
      console.log("PWA was installed");
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [mode, isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }

      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error("Error during installation:", error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setHasBeenDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if in mini app mode, already standalone, or has been dismissed
  if (
    mode !== "webapp" ||
    isStandalone ||
    hasBeenDismissed ||
    !showInstallPrompt ||
    !isInstallable
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-500 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-2xl">📱</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">
              Install Togedda
            </h3>
            <p className="text-xs text-gray-300 mb-3">
              Add to your home screen for quick access and offline support
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-gray-100 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 border border-gray-400 text-gray-300 text-xs rounded hover:bg-gray-800 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for manual install trigger
export function useWebAppInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return outcome === "accepted";
    } catch (error) {
      console.error("Error during installation:", error);
      return false;
    }
  };

  return {
    isInstallable,
    installApp,
  };
}
