"use client";

import { MiniAppProvider } from "@/contexts/miniapp-context";
import { env } from "@/lib/env";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import dynamic from "next/dynamic";
import { celo } from "viem/chains";
import { WagmiConfig, createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

const ErudaProvider = dynamic(
  () => import("../components/Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

// Configure Wagmi with Farcaster frame connector
const wagmiConfig = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
  connectors: [farcasterFrame()],
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErudaProvider>
      <WagmiConfig config={wagmiConfig}>
        <MiniKitProvider
          projectId={env.NEXT_PUBLIC_MINIKIT_PROJECT_ID}
          notificationProxyUrl="/api/notification"
          chain={celo}
        >
          <MiniAppProvider>{children}</MiniAppProvider>
        </MiniKitProvider>
      </WagmiConfig>
    </ErudaProvider>
  );
}
