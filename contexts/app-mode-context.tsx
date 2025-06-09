"use client";

// Add MiniKit to Window interface
declare global {
  interface Window {
    MiniKit?: any;
    farcaster?: any;
    fc?: any;
  }
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

// Types
export type AppMode = "miniapp" | "webapp" | "unknown";

export interface AppModeState {
  mode: AppMode;
  isFarcasterEnvironment: boolean;
  isStandalone: boolean;
  isReady: boolean;
  userAgent: string | null;
  canUseMiniKitFeatures: boolean;
}

export interface AppModeContextType extends AppModeState {
  // Actions
  setMode: (mode: AppMode) => void;
  refreshMode: () => void;

  // Helpers
  showMiniAppFeatures: () => boolean;
  showWebAppFeatures: () => boolean;
  showFallbackAuth: () => boolean;
}

// Initial state
const initialState: AppModeState = {
  mode: "unknown",
  isFarcasterEnvironment: false,
  isStandalone: false,
  isReady: false,
  userAgent: null,
  canUseMiniKitFeatures: false,
};

// Context
const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

// Provider component
export function AppModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppModeState>(initialState);

  // Detect app mode function (not memoized to avoid stale closures)
  const detectAppMode = (): AppModeState => {
    if (typeof window === "undefined") {
      return { ...initialState, mode: "unknown" };
    }

    const userAgent = navigator.userAgent;
    const currentUrl = window.location.href;
    const hasParent = window.parent !== window;
    const urlParams = new URLSearchParams(window.location.search);

    // Enhanced Farcaster environment detection
    const isFarcasterEnvironment =
      // URL parameters that indicate Farcaster
      urlParams.has("miniApp") ||
      urlParams.has("fc_frame") ||
      urlParams.has("farcaster") ||
      currentUrl.includes("?miniApp=true") ||
      currentUrl.includes("fc_frame=true") ||
      currentUrl.includes("farcaster=true") ||
      // Referrer from Farcaster clients
      document.referrer.includes("farcaster.xyz") ||
      document.referrer.includes("warpcast.com") ||
      document.referrer.includes("supercast.xyz") ||
      document.referrer.includes("herocast.xyz") ||
      // User agent indicators (Farcaster clients use custom user agents)
      userAgent.includes("Farcaster") ||
      userAgent.includes("Warpcast") ||
      userAgent.includes("Supercast") ||
      userAgent.includes("Herocast") ||
      // Running in iframe (common for mini apps) - but be more specific
      (hasParent &&
        (document.referrer.includes("farcaster") ||
          document.referrer.includes("warpcast") ||
          window.location.ancestorOrigins?.[0]?.includes("farcaster") ||
          window.location.ancestorOrigins?.[0]?.includes("warpcast"))) ||
      // Check for Farcaster-specific window properties
      "farcaster" in window ||
      "fc" in window ||
      // Check for MiniKit availability
      (typeof window !== "undefined" && window.MiniKit);

    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as any).standalone) ||
      currentUrl.includes("?standalone=true");

    // Determine mode
    let mode: AppMode = "webapp"; // Default to web app

    if (isFarcasterEnvironment) {
      mode = "miniapp";
    }

    // Can use MiniKit features if in Farcaster environment
    const canUseMiniKitFeatures =
      isFarcasterEnvironment && typeof window !== "undefined";

    return {
      mode,
      isFarcasterEnvironment,
      isStandalone,
      isReady: true,
      userAgent,
      canUseMiniKitFeatures,
    };
  };

  // Update state helper
  const updateState = (updates: Partial<AppModeState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Set mode manually
  const setMode = (mode: AppMode) => {
    updateState({ mode });
  };

  // Refresh mode detection
  const refreshMode = () => {
    const newState = detectAppMode();
    setState(newState);
  };

  // Helper functions
  const showMiniAppFeatures = (): boolean => {
    return state.mode === "miniapp" && state.canUseMiniKitFeatures;
  };

  const showWebAppFeatures = (): boolean => {
    return state.mode === "webapp" || !state.canUseMiniKitFeatures;
  };

  const showFallbackAuth = (): boolean => {
    // Show fallback auth when not in Farcaster environment
    // or when MiniKit features are not available
    return !state.canUseMiniKitFeatures;
  };

  // Initialize on mount only
  useEffect(() => {
    // Set initial state
    const initialDetection = detectAppMode();
    setState(initialDetection);
  }, []); // Empty dependency array to run only once on mount

  // Set up event listeners in a separate effect to avoid infinite loops
  useEffect(() => {
    // Only set up listeners if we're in a browser environment
    if (typeof window === "undefined") return;

    // Listen for URL changes (for SPA navigation)
    const handlePopState = () => {
      refreshMode();
    };

    // Listen for window focus (user might have navigated back)
    const handleFocus = () => {
      refreshMode();
    };

    // Listen for PWA mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      refreshMode();
    };

    // Add event listeners
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("focus", handleFocus);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("focus", handleFocus);

      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []); // Empty dependency array to run only once on mount

  // Debug logging in development (throttled and limited)
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && state.isReady) {
      // Only log once per session to prevent spam
      if (typeof window !== "undefined") {
        const hasLogged = sessionStorage.getItem("appmode-logged");

        if (!hasLogged) {
          console.log("[AppMode] Initial detection:", {
            mode: state.mode,
            isFarcasterEnvironment: state.isFarcasterEnvironment,
            isStandalone: state.isStandalone,
            canUseMiniKitFeatures: state.canUseMiniKitFeatures,
          });
          sessionStorage.setItem("appmode-logged", "true");
        }
      }
    }
  }, []); // Run only once on mount, not when isReady changes

  // Context value
  const contextValue: AppModeContextType = {
    // State
    ...state,

    // Actions
    setMode,
    refreshMode,

    // Helpers
    showMiniAppFeatures,
    showWebAppFeatures,
    showFallbackAuth,
  };

  return (
    <AppModeContext.Provider value={contextValue}>
      {children}
    </AppModeContext.Provider>
  );
}

// Hook to use app mode context
export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}

// Specific hooks for common use cases
export function useIsMiniApp(): boolean {
  const { mode } = useAppMode();
  return mode === "miniapp";
}

export function useIsWebApp(): boolean {
  const { mode } = useAppMode();
  return mode === "webapp";
}

export function useCanUseMiniKit(): boolean {
  const { canUseMiniKitFeatures } = useAppMode();
  return canUseMiniKitFeatures;
}

export function useFarcasterEnvironment(): boolean {
  const { isFarcasterEnvironment } = useAppMode();
  return isFarcasterEnvironment;
}

export function useIsStandalone(): boolean {
  const { isStandalone } = useAppMode();
  return isStandalone;
}

// Higher-order component for conditional rendering based on app mode
export function withAppMode<P extends object>(
  Component: React.ComponentType<P>,
  allowedModes: AppMode[]
) {
  const WrappedComponent = (props: P) => {
    const { mode, isReady } = useAppMode();

    if (!isReady) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      );
    }

    if (!allowedModes.includes(mode)) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="text-gray-400">
            This feature is not available in {mode} mode
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withAppMode(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Conditional components
export function MiniAppOnly({ children }: { children: ReactNode }) {
  const { showMiniAppFeatures } = useAppMode();
  return showMiniAppFeatures() ? <>{children}</> : null;
}

export function WebAppOnly({ children }: { children: ReactNode }) {
  const { showWebAppFeatures } = useAppMode();
  return showWebAppFeatures() ? <>{children}</> : null;
}

export function FarcasterOnly({ children }: { children: ReactNode }) {
  const { isFarcasterEnvironment } = useAppMode();
  return isFarcasterEnvironment ? <>{children}</> : null;
}

export function StandaloneOnly({ children }: { children: ReactNode }) {
  const { isStandalone } = useAppMode();
  return isStandalone ? <>{children}</> : null;
}

// App mode indicator component
export function AppModeIndicator({ className = "" }: { className?: string }) {
  const { mode, isStandalone, isFarcasterEnvironment } = useAppMode();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const modeColors = {
    miniapp: "bg-purple-600",
    webapp: "bg-blue-600",
    unknown: "bg-gray-600",
  };

  return (
    <div className={`fixed top-2 left-2 z-50 ${className}`}>
      <div
        className={`px-2 py-1 rounded text-xs text-white ${modeColors[mode]}`}
      >
        <div className="font-bold">{mode.toUpperCase()}</div>
        <div className="text-xs opacity-75">
          {isStandalone && "📱 "}
          {isFarcasterEnvironment && "🟣 "}
          {mode === "webapp" && "🌐 "}
        </div>
      </div>
    </div>
  );
}

// Types already exported above - removing duplicate exports
