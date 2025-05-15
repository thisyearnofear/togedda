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
        console.log("Farcaster SDK ready called successfully");
      } catch (error) {
        console.error("Error calling Farcaster SDK ready:", error);
      }
    };

    loadSDK();
  }, []);

  return <Home />;
}
