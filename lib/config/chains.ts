import { base, celo, polygon } from "viem/chains";
import { Chain } from "viem";

// Define custom chain configurations for networks not in viem/chains
export const monad = {
  id: 34443,
  name: "Monad",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"],
    },
    public: {
      http: ["https://rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "MonadScan", url: "https://explorer.monad.xyz" },
  },
  testnet: false,
} as const satisfies Chain;

// Supported chains configuration
export const supportedChains = [base, celo, polygon, monad] as const;

// Chain metadata for UI display
export const chainMetadata = {
  [base.id]: {
    name: "Base",
    shortName: "BASE",
    icon: "🔵",
    color: "#0052FF",
    bgColor: "bg-base-chain",
    textColor: "text-white",
    description: "Coinbase's L2 built on Optimism",
    category: "layer2" as const,
  },
  [celo.id]: {
    name: "Celo",
    shortName: "CELO",
    icon: "🌱",
    color: "#35D07F",
    bgColor: "bg-celo",
    textColor: "text-white",
    description: "Mobile-first DeFi platform",
    category: "layer1" as const,
  },
  [polygon.id]: {
    name: "Polygon",
    shortName: "MATIC",
    icon: "🔷",
    color: "#8247E5",
    bgColor: "bg-polygon",
    textColor: "text-white",
    description: "Ethereum scaling solution",
    category: "layer2" as const,
  },
  [monad.id]: {
    name: "Monad",
    shortName: "MON",
    icon: "⚡",
    color: "#FF6B35",
    bgColor: "bg-monad",
    textColor: "text-white",
    description: "High-performance EVM",
    category: "layer1" as const,
  },
} as const;

// RPC Configuration with fallbacks
export const rpcConfig = {
  [base.id]: {
    primary: "https://mainnet.base.org",
    fallbacks: [
      "https://base-mainnet.public.blastapi.io",
      "https://base.llamarpc.com",
    ],
  },
  [celo.id]: {
    primary: "https://forno.celo.org",
    fallbacks: [
      "https://rpc.ankr.com/celo",
      "https://celo-mainnet.public.blastapi.io",
    ],
  },
  [polygon.id]: {
    primary: "https://polygon-rpc.com",
    fallbacks: [
      "https://rpc.ankr.com/polygon",
      "https://polygon-mainnet.public.blastapi.io",
    ],
  },
  [monad.id]: {
    primary: "https://rpc.monad.xyz",
    fallbacks: ["https://rpc.monad.xyz"], // Add more when available
  },
} as const;

// Contract addresses per chain
export const contractAddresses = {
  fitness: {
    [base.id]: "0x...", // TODO: Deploy fitness contract
    [celo.id]: "0x...",
    [polygon.id]: "0x...",
    [monad.id]: "0x...",
  },
  predictionMarket: {
    [base.id]: "0x...", // TODO: Deploy prediction market contract
    [celo.id]: "0x...",
    [polygon.id]: "0x...",
    [monad.id]: "0x...",
  },
} as const;

// Helper functions
export function getChainById(chainId: number) {
  return supportedChains.find((chain) => chain.id === chainId);
}

export function getChainMetadata(chainId: number) {
  return chainMetadata[chainId as keyof typeof chainMetadata];
}

export function getRpcConfig(chainId: number) {
  return rpcConfig[chainId as keyof typeof rpcConfig];
}

export function getAllChainIds() {
  return supportedChains.map((chain) => chain.id);
}

export function isChainSupported(chainId: number): boolean {
  return getAllChainIds().includes(chainId as SupportedChainId);
}

// Type exports
export type SupportedChain = (typeof supportedChains)[number];
export type SupportedChainId = SupportedChain["id"];
export type ChainCategory = "layer1" | "layer2";
export type ChainMetadata = (typeof chainMetadata)[SupportedChainId];