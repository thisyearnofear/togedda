import { base, baseSepolia, celo, polygon, bsc, bscTestnet } from "viem/chains";
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
export const supportedChains = [bsc, base, baseSepolia, celo, polygon, monad, bscTestnet] as const;

// Chain metadata for UI display
export const chainMetadata = {
  [bsc.id]: {
    name: "BNB Chain",
    shortName: "BNB",
    icon: "🟡",
    color: "#F0B90B",
    bgColor: "bg-bnb",
    textColor: "text-black",
    description: "High-performance EVM with low fees",
    category: "layer1" as const,
  },
  [bscTestnet.id]: {
    name: "BNB Testnet",
    shortName: "BNB_T",
    icon: "🟡",
    color: "#F0B90B",
    bgColor: "bg-bnb",
    textColor: "text-black",
    description: "BNB Chain testnet for development",
    category: "layer1" as const,
  },
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
  [baseSepolia.id]: {
    name: "Base Sepolia",
    shortName: "BASE_SEPOLIA",
    icon: "🔵",
    color: "#0052FF",
    bgColor: "bg-base-chain",
    textColor: "text-white",
    description: "Base testnet for development and demos",
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
  [bsc.id]: {
    primary: "https://bsc-dataseed.binance.org",
    fallbacks: [
      "https://rpc.ankr.com/bsc",
      "https://bsc.rpc.blxrbdn.com",
    ],
  },
  [bscTestnet.id]: {
    primary: "https://data-seed-prebsc-1-s1.binance.org:8545",
    fallbacks: [
      "https://endpoints.omniatech.io/v1/bsc/testnet/public",
      "https://bsc-testnet.publicnode.com",
    ],
  },
  [base.id]: {
    primary: "https://mainnet.base.org",
    fallbacks: [
      "https://base-mainnet.public.blastapi.io",
      "https://base.llamarpc.com",
    ],
  },
  [baseSepolia.id]: {
    primary: "https://sepolia.base.org",
    fallbacks: [
      "https://base-sepolia.public.blastapi.io",
      "https://sepolia.base.org",
    ],
  },
  [celo.id]: {
    primary: "https://celo-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
    fallbacks: [
      "https://forno.celo.org",
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
    [bsc.id]: "0x...",
    [base.id]: "0x...", // TODO: Deploy fitness contract
    [celo.id]: "0x...",
    [polygon.id]: "0x...",
    [monad.id]: "0x...",
    [bscTestnet.id]: "0x...",
  },
  predictionMarket: {
    [bsc.id]: "0x...",
    [base.id]: "0x...", // TODO: Deploy prediction market contract
    [celo.id]: "0x...",
    [polygon.id]: "0x...",
    [monad.id]: "0x...",
    [bscTestnet.id]: "0x...",
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

/**
 * Get user-friendly chain name by chain ID
 * Centralized function to avoid hardcoded chain names throughout the app
 */
export function getChainName(chainId: number): string {
  const metadata = getChainMetadata(chainId);
  if (metadata) {
    return metadata.name;
  }

  // Fallback for common chains not in our metadata
  switch (chainId) {
    case 56:
      return "BNB Chain";
    case 97:
      return "BNB Testnet";
    case 8453:
      return "Base Mainnet";
    case 84532:
      return "Base Sepolia";
    case 42220:
      return "CELO Mainnet";
    case 1:
      return "Ethereum Mainnet";
    case 137:
      return "Polygon";
    default:
      return `Chain ${chainId}`;
  }
}

/**
 * Get chain-specific information for network switching UI
 */
export function getChainSwitchInfo(chainId: number) {
  const metadata = getChainMetadata(chainId);
  const name = getChainName(chainId);

  return {
    name,
    isTestnet: chainId === 84532, // Base Sepolia
    isProduction: chainId === 42220 || chainId === 8453, // CELO Mainnet or Base Mainnet
    faucetUrl: chainId === 84532 ? "https://www.alchemy.com/faucets/base-sepolia" : null,
    explorerUrl: getExplorerUrl(chainId),
    description: getChainDescription(chainId),
    emoji: metadata?.icon || "⛓️",
    color: metadata?.color || "#666666",
  };
}

/**
 * Get block explorer URL for a chain
 */
export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case 56:
      return "https://bscscan.com";
    case 97:
      return "https://testnet.bscscan.com";
    case 8453:
      return "https://basescan.org";
    case 84532:
      return "https://sepolia.basescan.org";
    case 42220:
      return "https://celoscan.io";
    case 1:
      return "https://etherscan.io";
    case 137:
      return "https://polygonscan.com";
    default:
      return "";
  }
}

/**
 * Get chain description for UI
 */
export function getChainDescription(chainId: number): string {
  const metadata = getChainMetadata(chainId);
  if (metadata?.description) {
    return metadata.description;
  }

  switch (chainId) {
    case 56:
      return "High-performance EVM with low fees";
    case 97:
      return "BNB Chain testnet for development";
    case 8453:
      return "Coinbase's L2 for production apps";
    case 84532:
      return "Base testnet for development and demos";
    case 42220:
      return "Mobile-first DeFi platform";
    case 1:
      return "Ethereum mainnet";
    case 137:
      return "Ethereum scaling solution";
    default:
      return "Blockchain network";
  }
}

// Type exports
export type SupportedChain = (typeof supportedChains)[number];
export type SupportedChainId = SupportedChain["id"];
export type ChainCategory = "layer1" | "layer2";
export type ChainMetadata = (typeof chainMetadata)[SupportedChainId];