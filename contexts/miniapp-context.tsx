"use client";

// Add type declarations for Frame SDK
interface FrameSDK {
  actions: {
    ready: () => Promise<void>;
    composeCast: (options: any) => Promise<any>;
    // Add other methods as needed
  };
  wallet?: any;
  // Add other properties as needed
}

// Define the module structure
interface FrameSDKModule {
  sdk?: FrameSDK;
  default?: {
    sdk?: FrameSDK;
  };
}

import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";
import { appConfig } from "@/lib/config/app";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";

// Types
interface MiniAppState {
  isFrameReady: boolean;
  isInitialized: boolean;
  isSDKLoaded: boolean;
  error: string | null;
  initializationAttempts: number;
}

interface MiniAppActions {
  setFrameReady: () => void;
  addFrame: () => Promise<{ url: string; token: string } | null>;
  clearError: () => void;
  retry: () => void;
}

interface MiniAppContextType extends MiniAppState, MiniAppActions {
  // Additional context data
  context: ReturnType<typeof useMiniKit>["context"];
  sdk: any; // Frame SDK instance
}

// Initial state
const initialState: MiniAppState = {
  isFrameReady: false,
  isInitialized: false,
  isSDKLoaded: false,
  error: null,
  initializationAttempts: 0,
};

// Context
const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

// Provider component
export function MiniAppProvider({ children }: { children: ReactNode }) {
  const { isFrameReady, setFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();

  // Local state
  const [state, setState] = useState<MiniAppState>(initialState);
  const [sdk, setSdk] = useState<any>(null);
  const initializationRef = useRef<boolean>(false);
  const maxRetries = 3;

  // Update state helper
  const updateState = useCallback((updates: Partial<MiniAppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Add frame with better error handling
  const handleAddFrame = useCallback(async () => {
    try {
      clearError();

      if (appConfig.debug.enabled) {
        console.log("[MiniApp] Attempting to add frame");
      }

      const result = await addFrame();

      if (result) {
        if (appConfig.debug.enabled) {
          console.log("[MiniApp] Frame added successfully:", result);
        }
        return result;
      }

      console.warn("[MiniApp] Add frame returned no result");
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add frame";
      console.error("[MiniApp] Error adding frame:", error);
      updateState({ error: errorMessage });
      return null;
    }
  }, [addFrame, clearError, updateState]);

  // Initialize SDK with retry logic
  const initializeSDK = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (initializationRef.current || state.isInitialized) {
      return;
    }

    initializationRef.current = true;

    try {
      updateState({
        initializationAttempts: state.initializationAttempts + 1,
        error: null,
      });

      if (appConfig.debug.enabled) {
        console.log(
          "[MiniApp] Initializing SDK, attempt:",
          state.initializationAttempts + 1
        );
      }

      // Check environment
      const isFarcasterEnvironment =
        typeof window !== "undefined" &&
        (window.location.href.includes("warpcast.com") ||
          window.location.href.includes("farcaster.xyz") ||
          window.location.href.includes("?miniApp=true") ||
          window.parent !== window);

      if (appConfig.debug.enabled) {
        console.log("[MiniApp] Environment check:", {
          isFarcasterEnvironment,
          url: typeof window !== "undefined" ? window.location.href : "SSR",
          hasParent: typeof window !== "undefined" && window.parent !== window,
        });
      }

      // Skip SDK initialization if not in Farcaster environment
      if (!isFarcasterEnvironment) {
        if (appConfig.debug.enabled) {
          console.log(
            "[MiniApp] Not in Farcaster environment, skipping SDK initialization"
          );
        }
        updateState({
          isInitialized: true,
          isSDKLoaded: false,
        });

        // Set frame as ready for web app mode
        if (!isFrameReady) {
          setFrameReady();
        }
        return;
      }

      // Dynamic import to avoid SSR issues
      let frameSdk: FrameSDK;
      try {
        const frameSDKModule = (await import(
          "@farcaster/frame-sdk"
        )) as FrameSDKModule;
        frameSdk = (frameSDKModule.sdk ||
          frameSDKModule.default?.sdk ||
          frameSDKModule.default) as FrameSDK;

        if (!frameSdk) {
          throw new Error("Frame SDK not found in module");
        }

        setSdk(frameSdk);
        updateState({ isSDKLoaded: true });
      } catch (importError) {
        console.error("[MiniApp] Failed to import Frame SDK:", importError);
        throw new Error(
          `Failed to load Frame SDK: ${
            importError instanceof Error ? importError.message : "Unknown error"
          }`
        );
      }

      // Check wallet availability
      if (frameSdk.wallet) {
        if (appConfig.debug.enabled) {
          console.log("[MiniApp] Wallet is available");
        }
      } else {
        if (appConfig.debug.enabled) {
          console.log("[MiniApp] Wallet is not available");
        }
      }

      // Initialize SDK actions
      await frameSdk.actions.ready();

      if (appConfig.debug.enabled) {
        console.log("[MiniApp] SDK ready called successfully");
      }

      // Update state
      updateState({ isInitialized: true });

      // Set frame as ready
      if (!isFrameReady) {
        setFrameReady();
      }

      // Store SDK globally for debugging in development
      if (appConfig.debug.enabled && typeof window !== "undefined") {
        (window as any).farcasterSDK = frameSdk;
        console.log("[MiniApp] SDK stored globally as window.farcasterSDK");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "SDK initialization failed";
      console.error("[MiniApp] Error initializing SDK:", error);

      updateState({
        error: errorMessage,
        isInitialized: true, // Mark as initialized to prevent infinite retries
      });

      // Set frame as ready anyway to allow the app to function
      if (!isFrameReady) {
        setFrameReady();
      }
    } finally {
      initializationRef.current = false;
    }
  }, [
    state.initializationAttempts,
    state.isInitialized,
    isFrameReady,
    setFrameReady,
    updateState,
  ]);

  // Retry initialization
  const retry = useCallback(() => {
    if (state.initializationAttempts < maxRetries) {
      updateState({ error: null });
      initializationRef.current = false;
      initializeSDK();
    } else {
      console.error("[MiniApp] Max initialization attempts reached");
      updateState({
        error: "Failed to initialize after multiple attempts",
        isInitialized: true,
      });
    }
  }, [state.initializationAttempts, initializeSDK, updateState]);

  // Initialize SDK on mount
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !state.isInitialized &&
      !initializationRef.current
    ) {
      initializeSDK();
    }
  }, [initializeSDK, state.isInitialized]);

  // Prompt to add frame after initialization
  useEffect(() => {
    const shouldPromptAddFrame =
      isFrameReady &&
      state.isInitialized &&
      context &&
      !context.client?.added &&
      !state.error;

    if (shouldPromptAddFrame) {
      // Add a small delay to ensure everything is ready
      const timeoutId = setTimeout(() => {
        handleAddFrame();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [context, handleAddFrame, isFrameReady, state.isInitialized, state.error]);

  // Context value
  const contextValue: MiniAppContextType = {
    // State
    isFrameReady,
    isInitialized: state.isInitialized,
    isSDKLoaded: state.isSDKLoaded,
    error: state.error,
    initializationAttempts: state.initializationAttempts,

    // Actions
    setFrameReady,
    addFrame: handleAddFrame,
    clearError,
    retry,

    // Additional data
    context,
    sdk,
  };

  return (
    <MiniAppContext.Provider value={contextValue}>
      {children}
    </MiniAppContext.Provider>
  );
}

// Hook to use MiniApp context
export function useMiniApp() {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return context;
}

// Additional hooks for specific use cases
export function useMiniAppReady() {
  const { isFrameReady, isInitialized, error } = useMiniApp();
  return {
    isReady: isFrameReady && isInitialized && !error,
    error,
  };
}

export function useMiniAppSDK() {
  const { sdk, isSDKLoaded } = useMiniApp();
  return { sdk, isLoaded: isSDKLoaded };
}

export function useMiniAppError() {
  const { error, clearError, retry, initializationAttempts } = useMiniApp();
  return {
    error,
    clearError,
    retry,
    canRetry: initializationAttempts < 3,
  };
}

// Type exports
export type { MiniAppContextType, MiniAppState, MiniAppActions };
