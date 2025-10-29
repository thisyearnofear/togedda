"use client";

import { UnifiedAppProvider } from "@/contexts/unified-app-context";
import { env } from "@/lib/env";
import { supportedChains, rpcConfig } from "@/lib/config/chains";
import { appConfig } from "@/lib/config/app";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NeynarContextProvider, Theme } from "@neynar/react";
import "@neynar/react/dist/style.css";
import dynamic from "next/dynamic";
import { ReactNode, useState, useEffect } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import {
  injected,
  walletConnect,
  coinbaseWallet,
  metaMask,
} from "wagmi/connectors";

const ErudaProvider = dynamic(
  () => import("./Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

// Create transport configuration with fallback RPC endpoints
const createTransports = () => {
  const transports: Record<number, ReturnType<typeof http>> = {};

  supportedChains.forEach((chain) => {
    const config = rpcConfig[chain.id as keyof typeof rpcConfig];
    if (config) {
      // Use primary RPC with fallbacks
      transports[chain.id] = http(config.primary, {
        batch: true,
      });
    }
  });

  return transports;
};

// Handle wallet extension conflicts
const handleWalletConflicts = () => {
  if (typeof window === "undefined") return;

  // only attempt to override if providers[] exists
  const eth = (window as any).ethereum;
  if (eth && Array.isArray(eth.providers)) {
    // guard against a read-only getter
    try {
      (window as any).ethereum = eth.providers[0];
      console.debug("[providers] window.ethereum overridden to first provider");
    } catch (_err) {
      console.warn(
        "[providers] window.ethereum is not writable — skipping override"
      );
    }
  }
  // (Optional) You can add any additional error suppression logic here if needed.
};

// Create connectors array with Farcaster Frame and web wallet connectors
const createConnectors = () => {
  const connectors = [
    // Farcaster Frame connector for mini app context
    farcasterMiniApp(),

    // Web wallet connectors for standalone web app usage
    metaMask({
      dappMetadata: {
        name: "Imperfect Form",
        url: "https://imperfect-form.vercel.app",
        iconUrl: "https://imperfect-form.vercel.app/icon-1024x1024.png",
      },
    }),

    injected({
      shimDisconnect: true,
    }),

    coinbaseWallet({
      appName: "Imperfect Form",
      appLogoUrl: "https://imperfect-form.vercel.app/icon-1024x1024.png",
    }),

    walletConnect({
      projectId:
        env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "default-project-id",
      metadata: {
        name: "Imperfect Form",
        description:
          "Track your fitness goals across multiple blockchain networks",
        url: "https://imperfect-form.vercel.app",
        icons: ["https://imperfect-form.vercel.app/icon-1024x1024.png"],
      },
    }),
  ];

  return connectors;
};

// Configure Wagmi with enhanced settings for Mini Apps
const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: createTransports(),
  connectors: createConnectors(),
  ssr: false, // Important for Mini Apps
  batch: {
    multicall: {
      batchSize: 1024 * 200, // 200kb
      wait: 16, // 16ms
    },
  },
  pollingInterval: 4000, // 4 seconds for Mini App context
});

// Create query client with optimized configuration
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        networkMode: "online",
      },
      mutations: {
        retry: 1,
        retryDelay: 2000,
        networkMode: "online",
      },
    },
  });
};

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  // Handle wallet conflicts on mount
  useEffect(() => {
    try {
      handleWalletConflicts();
    } catch (error) {
      console.warn("Failed to handle wallet conflicts:", error);
    }
  }, []);

  return (
    <ErudaProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <NeynarContextProvider
            settings={{
              clientId: env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
              defaultTheme: Theme.Dark,
            }}
          >
            <MiniKitProvider
              projectId={env.NEXT_PUBLIC_MINIKIT_PROJECT_ID}
              notificationProxyUrl={appConfig.farcaster.notificationProxyUrl}
              chain={appConfig.chains.default}
            >
              <UnifiedAppProvider>{children}</UnifiedAppProvider>
            </MiniKitProvider>
          </NeynarContextProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ErudaProvider>
  );
}

// Export wagmi config for use in other parts of the app
export { wagmiConfig };
