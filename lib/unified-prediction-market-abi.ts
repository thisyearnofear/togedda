/**
 * Unified Prediction Market ABI
 * This ABI is used for both CELO and BASE deployments
 */
export const unifiedPredictionMarketABI = [
  // Constructor
  {
    "inputs": [
      {"internalType": "address", "name": "_charityAddress", "type": "address"},
      {"internalType": "address", "name": "_maintenanceAddress", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "title", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "targetDate", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "targetValue", "type": "uint256"}
    ],
    "name": "PredictionCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "voter", "type": "address"},
      {"indexed": false, "internalType": "bool", "name": "isYes", "type": "bool"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"indexed": false, "internalType": "bool", "name": "outcome", "type": "bool"},
      {"indexed": false, "internalType": "uint256", "name": "totalPool", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "winningPool", "type": "uint256"}
    ],
    "name": "PredictionResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "claimer", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "RewardClaimed",
    "type": "event"
  },

  // Main Functions
  {
    "inputs": [
      {"internalType": "string", "name": "_title", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "uint256", "name": "_targetDate", "type": "uint256"},
      {"internalType": "uint256", "name": "_targetValue", "type": "uint256"},
      {"internalType": "uint8", "name": "_category", "type": "uint8"},
      {"internalType": "string", "name": "_network", "type": "string"},
      {"internalType": "string", "name": "_emoji", "type": "string"},
      {"internalType": "bool", "name": "_autoResolvable", "type": "bool"}
    ],
    "name": "createPrediction",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"internalType": "bool", "name": "isYes", "type": "bool"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"internalType": "bool", "name": "outcome", "type": "bool"}
    ],
    "name": "resolvePrediction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"}
    ],
    "name": "claimReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "releaseSweatEquityFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // View Functions
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"}
    ],
    "name": "getPrediction",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "creator", "type": "address"},
          {"internalType": "string", "name": "title", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "uint256", "name": "targetDate", "type": "uint256"},
          {"internalType": "uint256", "name": "targetValue", "type": "uint256"},
          {"internalType": "uint256", "name": "currentValue", "type": "uint256"},
          {"internalType": "uint8", "name": "category", "type": "uint8"},
          {"internalType": "string", "name": "network", "type": "string"},
          {"internalType": "string", "name": "emoji", "type": "string"},
          {"internalType": "uint256", "name": "totalStaked", "type": "uint256"},
          {"internalType": "uint256", "name": "yesVotes", "type": "uint256"},
          {"internalType": "uint256", "name": "noVotes", "type": "uint256"},
          {"internalType": "uint8", "name": "status", "type": "uint8"},
          {"internalType": "uint8", "name": "outcome", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "bool", "name": "autoResolvable", "type": "bool"}
        ],
        "internalType": "struct UnifiedPredictionMarket.Prediction",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"}
    ],
    "name": "getPredictionDetails",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "uint256", "name": "targetDate", "type": "uint256"},
      {"internalType": "uint256", "name": "targetValue", "type": "uint256"},
      {"internalType": "uint256", "name": "currentValue", "type": "uint256"},
      {"internalType": "uint8", "name": "category", "type": "uint8"},
      {"internalType": "string", "name": "network", "type": "string"},
      {"internalType": "string", "name": "emoji", "type": "string"},
      {"internalType": "uint256", "name": "totalStaked", "type": "uint256"},
      {"internalType": "uint256", "name": "yesVotes", "type": "uint256"},
      {"internalType": "uint256", "name": "noVotes", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "bool", "name": "outcome", "type": "bool"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "bool", "name": "autoResolvable", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserVote",
    "outputs": [
      {
        "components": [
          {"internalType": "bool", "name": "isYes", "type": "bool"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "bool", "name": "claimed", "type": "bool"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "internalType": "struct UnifiedPredictionMarket.Vote",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "predictionId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserStake",
    "outputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "bool", "name": "hasStake", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalPredictions",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalFeePercentage",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserPredictions",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // State Variables (public getters)
  {
    "inputs": [],
    "name": "charityAddress",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maintenanceAddress",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "charityFeePercentage",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maintenanceFeePercentage",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalFeePercentage",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextPredictionId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPredictions",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Admin Functions
  {
    "inputs": [
      {"internalType": "uint256", "name": "_charityFeePercentage", "type": "uint256"},
      {"internalType": "uint256", "name": "_maintenanceFeePercentage", "type": "uint256"}
    ],
    "name": "updateFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_charityAddress", "type": "address"},
      {"internalType": "address", "name": "_maintenanceAddress", "type": "address"}
    ],
    "name": "updateAddresses",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "newOwner", "type": "address"}
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const unifiedPredictionMarketAdminABIExtensions = [
  {
    "inputs": [
      {"internalType": "address", "name": "_sweatEquityBot", "type": "address"}
    ],
    "name": "setSweatEquityBot",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
