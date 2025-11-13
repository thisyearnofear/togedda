"use client";

import { Suspense, useState, useEffect } from "react";
import DebugFallback from "@/components/DebugFallback";
import MiniAppWrapper from "@/components/MiniAppWrapper";

// Simple loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-4 animate-spin">⟳</div>
        <div className="text-lg">Loading Togedda...</div>
        <div className="text-sm text-gray-400 mt-2">
          Initializing components...
        </div>
      </div>
    </div>
  );
}

// Error boundary component with manual import
function HomeWithErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);
  const [Home, setHome] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Manual dynamic import with better error handling
    const loadHome = async () => {
      try {
        const mod = await import("@/components/Home");
        setHome(() => mod.default);
        setLoading(false);
      } catch (importError) {
        console.error("Failed to load Home component:", importError);
        setError(importError as Error);
        setLoading(false);
      }
    };

    loadHome();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <DebugFallback error={error} />;
  }

  if (!Home) {
    return <DebugFallback error={new Error("Home component not found")} />;
  }

  return <Home />;
}

export default function App() {
  return (
    <MiniAppWrapper>
      <Suspense fallback={<LoadingScreen />}>
        <HomeWithErrorBoundary />
      </Suspense>
    </MiniAppWrapper>
  );
}
