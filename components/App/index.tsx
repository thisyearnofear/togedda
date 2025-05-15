"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const Home = dynamic(() => import("@/components/Home"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function App() {
  useEffect(() => {
    // Import the SDK dynamically to avoid SSR issues
    const loadSDK = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        // Call ready to hide the splash screen
        await sdk.actions.ready();
        console.log(
          "Farcaster SDK ready called successfully from App component"
        );

        // Set a global flag to prevent multiple initializations
        window.__FARCASTER_SDK_INITIALIZED = true;
      } catch (error) {
        console.error("Error calling Farcaster SDK ready:", error);
      }
    };

    // Only initialize if not already done
    if (typeof window !== "undefined" && !window.__FARCASTER_SDK_INITIALIZED) {
      loadSDK();
    }
  }, []);

  return <Home />;
}
