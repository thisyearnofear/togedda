/**
 * Legacy constants file - maintained for backward compatibility
 * New code should use unified-prediction-market-abi.ts and dual-chain-service.ts
 */

import { unifiedPredictionMarketABI } from './unified-prediction-market-abi';

// Contract addresses for different networks (legacy - use dual-chain-service.ts for new code)
export const POLYGON_CONTRACT_ADDRESS = "0xc783d6E12560dc251F5067A62426A5f3b45b6888";
export const CELO_CONTRACT_ADDRESS = "0xB0cbC7325EbC744CcB14211CA74C5a764928F273";
export const MONAD_CONTRACT_ADDRESS = "0x653d41Fba630381aA44d8598a4b35Ce257924d65";
export const BASE_CONTRACT_ADDRESS = "0xFcC01405967676Be7418123c77C2acF254Dc7137";

// Chain IDs
export const CHAIN_IDS = {
  polygon: 137,
  celo: 42220,
  monad: 10143,
  base: 84532,
};

// RPC URLs with fallbacks
export const RPC_URLS = {
  polygon: [
    "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
    "https://polygon-rpc.com"
  ],
  celo: [
    "https://celo-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
    "https://forno.celo.org",
    "https://rpc.ankr.com/celo"
  ],
  monad: [
    "https://testnet-rpc.monad.xyz"
  ],
  base: [
    "https://sepolia.base.org",
    "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
  ]
};

// Network colors for UI components
export const NETWORK_COLORS = {
  polygon: "#800080", // Purple
  celo: "#fcb131",    // Yellow
  base: "#416ced",    // Blue
  monad: "#000000",   // Black
} as const;

// Fitness goals
export const MOUNT_OLYMPUS_GOAL = 291700; // 2917m × 100kg
export const KENYA_RUN_GOAL = 1030000;    // 1,030 kilometers in meters

// Message expiration time for authentication
export const MESSAGE_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days

// Cache duration for leaderboard data (5 minutes)
export const LEADERBOARD_CACHE_DURATION = 5 * 60 * 1000;

// ABI for the fitness leaderboard contracts
export const fitnessLeaderboardABI = [
  {
    "inputs": [],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "pushups",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "squats",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct Score[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getUserScore",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "pushups",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "squats",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct Score",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Legacy ABI export - now points to unified ABI
export const predictionMarketABI = unifiedPredictionMarketABI;

// Legacy prediction market addresses - use dual-chain-service.ts for new code
export const PREDICTION_MARKET_ADDRESS = "0xeF7009384cF166eF52e0F3529AcB79Ff53A2a3CA";
export const PREDICTION_BOT_ADDRESS = "0x5552e0ca9fd8e71bc2D0941619248f91d30CDa0E";
export const PREDICTION_PROPOSAL_FEE = "1000000000000000"; // 0.001 ETH

// Base Sepolia network configuration
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
export const BASE_SEPOLIA_EXPLORER_URL = "https://sepolia.basescan.org";

// Charity and maintenance addresses
export const CHARITY_ADDRESS = "0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1";
export const WALLET_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058";
