"use client";

import { useEffect, useState, ReactNode } from "react";
import { useMiniApp } from "@/hooks/useMiniApp";
import { isMiniAppEnvironment } from "@/lib/miniapp/sdk";

interface MiniAppWrapperProps {
  children: ReactNode;
}

function MiniAppLoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-4 animate-pulse">🏃‍♂️</div>
        <div className="text-lg">Initializing Mini App...</div>
        <div className="text-sm text-gray-400 mt-2">Loading Imperfect Form</div>
      </div>
    </div>
  );
}

function MiniAppErrorScreen({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-3xl mb-4">⚠️</div>
        <div className="text-lg mb-2">Mini App Error</div>
        <div className="text-sm text-gray-400 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-white text-black px-4 py-2 rounded text-sm hover:bg-gray-200"
        >
          Reload App
        </button>
      </div>
    </div>
  );
}

export default function MiniAppWrapper({ children }: MiniAppWrapperProps) {
  const { isReady, isLoading, error, context, isMiniApp } = useMiniApp();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if we're in a Mini App environment
  const isInMiniApp = isMiniApp || isMiniAppEnvironment();

  // Add Mini App specific classes and styles when ready
  useEffect(() => {
    if (isMounted && isInMiniApp && isReady) {
      // Apply Mini App specific styling
      const body = document.body;
      body.classList.add("miniapp-ready");

      // Set CSS custom properties for Mini App environment
      body.style.setProperty(
        "--miniapp-user-fid",
        context?.user?.fid?.toString() || ""
      );
      body.style.setProperty(
        "--miniapp-location-type",
        context?.location?.type || ""
      );

      return () => {
        body.classList.remove("miniapp-ready");
        body.style.removeProperty("--miniapp-user-fid");
        body.style.removeProperty("--miniapp-location-type");
      };
    }
  }, [isMounted, context, isReady, isInMiniApp]);

  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  // Show loading screen while initializing
  if (isInMiniApp && isLoading) {
    return <MiniAppLoadingScreen />;
  }

  // Show error screen if initialization failed
  if (isInMiniApp && error) {
    return <MiniAppErrorScreen error={error} />;
  }

  return (
    <div
      className={`miniapp-container ${
        isInMiniApp ? "in-miniapp" : "standalone"
      }`}
    >
      {children}
    </div>
  );
}
