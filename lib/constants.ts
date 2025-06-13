// Contract addresses for different networks
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

// Network colors for theming
export const NETWORK_COLORS = {
  polygon: "#800080", // Purple
  celo: "#fcb131",    // Yellow
  base: "#416ced",    // Blue
  monad: "#000000",   // Black
};

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

// Complete ABI for the prediction market contract
export const predictionMarketABI = [
  // View Functions
  {
    name: "getPrediction",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_predictionId", type: "uint256" }
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "targetDate", type: "uint256" },
          { name: "targetValue", type: "uint256" },
          { name: "currentValue", type: "uint256" },
          { name: "category", type: "uint8" },
          { name: "network", type: "string" },
          { name: "emoji", type: "string" },
          { name: "totalStaked", type: "uint256" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "autoResolvable", type: "bool" }
        ]
      }
    ]
  },
  {
    name: "getUserVote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_user", type: "address" }
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "isYes", type: "bool" },
          { name: "amount", type: "uint256" },
          { name: "claimed", type: "bool" }
        ]
      }
    ]
  },
  {
    name: "getTotalPredictions",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "getParticipants",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }]
  },
  {
    name: "getTotalFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "charityFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "maintenanceFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "charityAddress",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "maintenanceAddress",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },

  // State-Changing Functions
  {
    name: "createPrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_targetDate", type: "uint256" },
      { name: "_targetValue", type: "uint256" },
      { name: "_category", type: "uint8" },
      { name: "_network", type: "string" },
      { name: "_emoji", type: "string" },
      { name: "_autoResolvable", type: "bool" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "vote",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_isYes", type: "bool" }
    ],
    outputs: []
  },
  {
    name: "claimReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },
  {
    name: "claimRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },
  {
    name: "autoResolvePrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },

  // Owner Functions
  {
    name: "resolvePrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_outcome", type: "uint8" }
    ],
    outputs: []
  },
  {
    name: "cancelPrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },
  {
    name: "updatePredictionValue",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_currentValue", type: "uint256" }
    ],
    outputs: []
  },
  {
    name: "updateFeePercentages",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_newCharityFeePercentage", type: "uint256" },
      { name: "_newMaintenanceFeePercentage", type: "uint256" }
    ],
    outputs: []
  },
  {
    name: "updateCharityAddress",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newCharityAddress", type: "address" }],
    outputs: []
  },
  {
    name: "updateMaintenanceAddress",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newMaintenanceAddress", type: "address" }],
    outputs: []
  },
  {
    name: "transferOwnership",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newOwner", type: "address" }],
    outputs: []
  }
] as const;

/**
 * Base Batches Buildathon Constants
 * Constants for the AI-Powered Prediction Market with XMTP integration
 */

/**
 * Address of the deployed ImperfectFormPredictionMarketV2 contract on Base Sepolia
 */
export const PREDICTION_MARKET_ADDRESS = "0x9B4Be1030eDC90205C10aEE54920192A13c12Cba";

/**
 * Address of the deployed PredictionBot contract on Base Sepolia
 */
export const PREDICTION_BOT_ADDRESS = "0x5552e0ca9fd8e71bc2D0941619248f91d30CDa0E";

/**
 * Initial fee for proposing predictions via PredictionBot (in wei)
 */
export const PREDICTION_PROPOSAL_FEE = "1000000000000000"; // 0.001 ETH

/**
 * Base Sepolia network configuration
 */
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
export const BASE_SEPOLIA_EXPLORER_URL = "https://sepolia.basescan.org";

/**
 * Charity address associated with the prediction market
 */
export const CHARITY_ADDRESS = "0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1";

/**
 * Wallet address (if needed for specific configurations or testing)
 */
export const WALLET_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058";
