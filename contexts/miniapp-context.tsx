"use client";

import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface MiniAppContextType {
  isFrameReady: boolean;
  setFrameReady: () => void;
  addFrame: () => Promise<{ url: string; token: string } | null>;
  isInitialized: boolean;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const { isFrameReady, setFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();
  const [isInitialized, setIsInitialized] = useState(false);

  const handleAddFrame = useCallback(async () => {
    try {
      const result = await addFrame();
      if (result) {
        return result;
      }
      return null;
    } catch (error) {
      console.error("[error] adding frame", error);
      return null;
    }
  }, [addFrame]);

  // Initialize the SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Check if we're in a Farcaster environment
        const isFarcasterEnvironment =
          typeof window !== "undefined" &&
          (window.location.href.includes("warpcast.com") ||
            window.location.href.includes("farcaster.xyz") ||
            window.location.href.includes("?miniApp=true") ||
            window.parent !== window);

        // Import the SDK dynamically to avoid SSR issues
        const { sdk } = await import("@farcaster/frame-sdk");

        // Call ready to hide the splash screen
        await sdk.actions.ready();
        console.log("Farcaster SDK ready called successfully");

        // Mark as initialized
        setIsInitialized(true);

        // Set frame as ready
        if (!isFrameReady) {
          setFrameReady();
        }
      } catch (error) {
        console.error("Error initializing Farcaster SDK:", error);
        // Still mark as initialized to prevent infinite retries
        setIsInitialized(true);

        // Set frame as ready anyway to allow the app to function
        if (!isFrameReady) {
          setFrameReady();
        }
      }
    };

    // Only initialize once
    if (typeof window !== "undefined" && !isInitialized) {
      initializeSDK();
    }
  }, [isFrameReady, setFrameReady, isInitialized]);

  // Prompt to add frame after initialization
  useEffect(() => {
    // when the frame is ready and initialized, if the frame is not added, prompt the user to add the frame
    if (isFrameReady && isInitialized && context && !context.client?.added) {
      handleAddFrame();
    }
  }, [context, handleAddFrame, isFrameReady, isInitialized]);

  return (
    <MiniAppContext.Provider
      value={{
        isFrameReady,
        setFrameReady,
        addFrame: handleAddFrame,
        isInitialized,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return context;
}
