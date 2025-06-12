"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { useAccount } from "wagmi";
import { useNeynarContext } from "@neynar/react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

// =============================================================================
// TYPES - Single source of truth for all app state
// =============================================================================

export type AppMode = "miniapp" | "webapp" | "unknown";
export type AuthType = "farcaster" | "wallet" | "none";

export interface User {
  // Farcaster data
  fid?: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  custody_address?: string;

  // Wallet data
  address?: string;

  // Unified fields
  authType: AuthType;
  timestamp?: number;
}

export interface AppEnvironment {
  mode: AppMode;
  isFarcasterEnvironment: boolean;
  isStandalone: boolean;
  canUseMiniKitFeatures: boolean;
  userAgent: string | null;
}

export interface AppState {
  // Environment
  environment: AppEnvironment;
  isReady: boolean;

  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Wallet
  isWalletConnected: boolean;
  walletAddress: string | null;

  // Errors
  error: string | null;
}

// =============================================================================
// ACTIONS - All state mutations go through reducer
// =============================================================================

type AppAction =
  | { type: "SET_ENVIRONMENT"; payload: AppEnvironment }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_LOADING"; payload: boolean }
  | {
      type: "SET_WALLET";
      payload: { isConnected: boolean; address: string | null };
    }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_READY"; payload: boolean }
  | { type: "RESET_STATE" };

// =============================================================================
// REDUCER - Pure state management
// =============================================================================

const initialState: AppState = {
  environment: {
    mode: "unknown",
    isFarcasterEnvironment: false,
    isStandalone: false,
    canUseMiniKitFeatures: false,
    userAgent: null,
  },
  isReady: false,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isWalletConnected: false,
  walletAddress: null,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ENVIRONMENT":
      return {
        ...state,
        environment: action.payload,
      };

    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        error: null,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_WALLET":
      return {
        ...state,
        isWalletConnected: action.payload.isConnected,
        walletAddress: action.payload.address,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "SET_READY":
      return {
        ...state,
        isReady: action.payload,
      };

    case "RESET_STATE":
      return {
        ...initialState,
        environment: state.environment, // Keep environment
        isReady: state.isReady,
      };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface AppContextType extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;

  // Computed properties
  isFarcasterUser: boolean;
  isWalletUser: boolean;
  showMiniAppFeatures: boolean;
  showWebAppFeatures: boolean;

  // Helpers
  getFid: () => string | null;
  getAddress: () => string | null;

  // MiniKit context (for advanced usage)
  miniKitContext: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// =============================================================================
// PROVIDER - Single unified provider
// =============================================================================

interface UnifiedAppProviderProps {
  children: ReactNode;
}

export function UnifiedAppProvider({ children }: UnifiedAppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // External hooks
  const { isConnected, address } = useAccount();
  const { user: neynarUser } = useNeynarContext();
  const { context: miniKitContext, setFrameReady, isFrameReady } = useMiniKit();

  // =============================================================================
  // ENVIRONMENT DETECTION - Centralized logic
  // =============================================================================

  useEffect(() => {
    const detectEnvironment = (): AppEnvironment => {
      if (typeof window === "undefined") {
        return initialState.environment;
      }

      const userAgent = navigator.userAgent;
      const currentUrl = window.location.href;
      const referrer = document.referrer;
      const urlParams = new URLSearchParams(window.location.search);
      const hasParent = window.parent !== window;

      // Farcaster environment checks
      const checks = {
        urlParams: urlParams.has("miniApp") || urlParams.has("fc_frame"),
        referrer:
          referrer.includes("farcaster") || referrer.includes("warpcast"),
        userAgent:
          userAgent.includes("Farcaster") || userAgent.includes("Warpcast"),
        windowProps: "farcaster" in window || "fc" in window,
        miniKit: !!window.MiniKit,
        frameContext: hasParent && currentUrl.includes("frame"),
      };

      const isFarcasterEnvironment = Object.values(checks).some(Boolean);

      // Determine mode
      let mode: AppMode = "webapp";
      const manualOverride = urlParams.get("appMode") as AppMode | null;

      if (manualOverride && ["miniapp", "webapp"].includes(manualOverride)) {
        mode = manualOverride;
      } else if (isFarcasterEnvironment) {
        mode = "miniapp";
      }

      // Standalone detection
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as any).standalone) ||
        currentUrl.includes("?standalone=true");

      const canUseMiniKitFeatures =
        (isFarcasterEnvironment || mode === "miniapp") &&
        typeof window !== "undefined";

      return {
        mode,
        isFarcasterEnvironment,
        isStandalone,
        canUseMiniKitFeatures,
        userAgent,
      };
    };

    const environment = detectEnvironment();
    dispatch({ type: "SET_ENVIRONMENT", payload: environment });
    dispatch({ type: "SET_READY", payload: true });
  }, []);

  // =============================================================================
  // MINIKIT FRAME READY - Critical for Farcaster mini apps
  // =============================================================================

  useEffect(() => {
    // Call setFrameReady when the app is ready to be shown
    // This is crucial for MiniKit apps to work properly in Farcaster
    if (
      state.isReady &&
      state.environment.mode === "miniapp" &&
      !isFrameReady
    ) {
      console.log("[UnifiedApp] Setting frame ready for MiniKit");
      setFrameReady();
    }
  }, [state.isReady, state.environment.mode, isFrameReady, setFrameReady]);

  // =============================================================================
  // USER MANAGEMENT - Unified authentication
  // =============================================================================

  useEffect(() => {
    let user: User | null = null;

    // Priority: MiniKit > Neynar > Wallet
    if (miniKitContext?.user) {
      user = {
        fid: miniKitContext.user.fid.toString(),
        username: miniKitContext.user.username,
        display_name: miniKitContext.user.displayName,
        pfp_url: miniKitContext.user.pfpUrl,
        // custody_address might not be available in MiniKit context
        custody_address: undefined,
        authType: "farcaster",
        timestamp: Date.now(),
      };
    } else if (neynarUser) {
      user = {
        fid: neynarUser.fid.toString(),
        username: neynarUser.username,
        display_name: neynarUser.display_name,
        pfp_url: neynarUser.pfp_url,
        custody_address: neynarUser.custody_address,
        authType: "farcaster",
        timestamp: Date.now(),
      };
    } else if (isConnected && address) {
      user = {
        address,
        authType: "wallet",
        timestamp: Date.now(),
      };
    }

    dispatch({ type: "SET_USER", payload: user });
    dispatch({ type: "SET_LOADING", payload: false });
  }, [miniKitContext?.user, neynarUser, isConnected, address]);

  // =============================================================================
  // WALLET STATE SYNC
  // =============================================================================

  useEffect(() => {
    dispatch({
      type: "SET_WALLET",
      payload: { isConnected, address: address || null },
    });
  }, [isConnected, address]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const setUser = (user: User | null) => {
    dispatch({ type: "SET_USER", payload: user });

    // Persist to localStorage
    if (user) {
      localStorage.setItem("app_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("app_user");
    }
  };

  const setError = (error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  };

  const disconnect = () => {
    dispatch({ type: "RESET_STATE" });
    localStorage.removeItem("app_user");
  };

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const isFarcasterUser = state.user?.authType === "farcaster";
  const isWalletUser = state.user?.authType === "wallet";
  const showMiniAppFeatures =
    state.environment.mode === "miniapp" &&
    state.environment.canUseMiniKitFeatures;
  const showWebAppFeatures =
    state.environment.mode === "webapp" ||
    !state.environment.canUseMiniKitFeatures;

  // =============================================================================
  // HELPERS
  // =============================================================================

  const getFid = () => state.user?.fid || null;
  const getAddress = () => state.user?.address || state.walletAddress;

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AppContextType = {
    ...state,
    setUser,
    setError,
    disconnect,
    isFarcasterUser,
    isWalletUser,
    showMiniAppFeatures,
    showWebAppFeatures,
    getFid,
    getAddress,
    miniKitContext,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useUnifiedApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useUnifiedApp must be used within a UnifiedAppProvider");
  }
  return context;
}

// Specific hooks for common use cases
export const useAppEnvironment = () => {
  const { environment, isReady, showMiniAppFeatures, showWebAppFeatures } =
    useUnifiedApp();
  return { ...environment, isReady, showMiniAppFeatures, showWebAppFeatures };
};

export const useAppUser = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isFarcasterUser,
    isWalletUser,
    getFid,
    getAddress,
  } = useUnifiedApp();
  return {
    user,
    isAuthenticated,
    isLoading,
    isFarcasterUser,
    isWalletUser,
    getFid,
    getAddress,
  };
};

export const useAppWallet = () => {
  const { isWalletConnected, walletAddress, getAddress } = useUnifiedApp();
  return { isWalletConnected, walletAddress, getAddress };
};
