"use client";

import { useEffect, useState, useCallback } from "react";
import { miniApp, type MiniAppContext } from "@/lib/miniapp/sdk";

export interface UseMiniAppReturn {
  context: MiniAppContext | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  user: MiniAppContext["user"];
  location: MiniAppContext["location"];
  isMiniApp: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  actions: {
    openUrl: (url: string) => Promise<void>;
    composeCast: (text?: string, embeds?: string[]) => Promise<any>;
    close: () => Promise<void>;
    connectWallet: () => Promise<any>;
    getAuthToken: () => Promise<string | null>;
    authenticatedFetch: (
      url: string,
      options?: RequestInit
    ) => Promise<Response>;
  };
  haptics: {
    impact: (style?: "light" | "medium" | "heavy") => Promise<void>;
    notification: (type?: "success" | "warning" | "error") => Promise<void>;
    selection: () => Promise<void>;
  };
  wallet: {
    getEthereumProvider: () => Promise<any>;
    getSolanaProvider: () => Promise<any>;
  };
}

export function useMiniApp(): UseMiniAppReturn {
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the Mini App SDK
  useEffect(() => {
    let mounted = true;

    const initializeMiniApp = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await miniApp.initialize();

        if (mounted) {
          setContext(miniApp.context);
          setIsReady(miniApp.isReady);
        }
      } catch (err) {
        console.error("Failed to initialize Mini App:", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize Mini App"
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeMiniApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Action handlers with error handling
  const openUrl = useCallback(async (url: string) => {
    try {
      await miniApp.openUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open URL");
      throw err;
    }
  }, []);

  const composeCast = useCallback(async (text?: string, embeds?: string[]) => {
    try {
      return await miniApp.composeCast(text, embeds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compose cast");
      throw err;
    }
  }, []);

  const close = useCallback(async () => {
    try {
      await miniApp.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close");
      throw err;
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      return await miniApp.connectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      throw err;
    }
  }, []);

  const getAuthToken = useCallback(async () => {
    try {
      return await miniApp.getAuthToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get auth token");
      return null;
    }
  }, []);

  const authenticatedFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      try {
        return await miniApp.authenticatedFetch(url, options);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Authenticated fetch failed"
        );
        throw err;
      }
    },
    []
  );

  // Haptic feedback handlers
  const hapticImpact = useCallback(
    async (style: "light" | "medium" | "heavy" = "medium") => {
      try {
        await miniApp.hapticImpact(style);
      } catch (err) {
        console.warn("Haptic impact failed:", err);
      }
    },
    []
  );

  const hapticNotification = useCallback(
    async (type: "success" | "warning" | "error" = "success") => {
      try {
        await miniApp.hapticNotification(type);
      } catch (err) {
        console.warn("Haptic notification failed:", err);
      }
    },
    []
  );

  const hapticSelection = useCallback(async () => {
    try {
      await miniApp.hapticSelection();
    } catch (err) {
      console.warn("Haptic selection failed:", err);
    }
  }, []);

  return {
    context,
    isReady,
    isLoading,
    error,
    user: context?.user,
    location: context?.location,
    isMiniApp: miniApp.isMiniApp(),
    isDesktop: miniApp.isDesktop(),
    isMobile: miniApp.isMobile(),
    actions: {
      openUrl,
      composeCast,
      close,
      connectWallet,
      getAuthToken,
      authenticatedFetch,
    },
    haptics: {
      impact: hapticImpact,
      notification: hapticNotification,
      selection: hapticSelection,
    },
    wallet: {
      getEthereumProvider: () => miniApp.getEthereumProvider(),
      getSolanaProvider: () => miniApp.getSolanaProvider(),
    },
  };
}

// Utility hooks for specific use cases
export function useMiniAppUser() {
  const { user, isLoading } = useMiniApp();
  return { user, isLoading };
}

export function useMiniAppAuth() {
  const { user, isReady, actions } = useMiniApp();
  return {
    user,
    isAuthenticated: !!user,
    isReady,
    getAuthToken: actions.getAuthToken,
  };
}

export function useMiniAppWallet() {
  const { wallet, actions } = useMiniApp();
  return {
    ...wallet,
    connect: actions.connectWallet,
  };
}

export function useMiniAppHaptics() {
  const { haptics } = useMiniApp();
  return haptics;
}
