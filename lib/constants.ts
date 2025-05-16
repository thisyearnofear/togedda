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

// Message expiration time for authentication
export const MESSAGE_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days

// Cache duration for leaderboard data (5 minutes)
export const LEADERBOARD_CACHE_DURATION = 5 * 60 * 1000;

// Complete ABI for the prediction market contract
export const predictionMarketABI = [
  // View Functions
  "function getPrediction(uint256 _predictionId) external view returns (tuple(uint256 id, address creator, string title, string description, uint256 targetDate, uint256 targetValue, uint256 currentValue, uint8 category, string network, string emoji, uint256 totalStaked, uint256 yesVotes, uint256 noVotes, uint8 status, uint8 outcome, uint256 createdAt, bool autoResolvable))",
  "function getUserVote(uint256 _predictionId, address _user) external view returns (tuple(bool isYes, uint256 amount, bool claimed))",
  "function getTotalPredictions() external view returns (uint256)",
  "function getParticipants(uint256 _predictionId) external view returns (address[])",
  "function getTotalFeePercentage() external view returns (uint256)",
  "function charityFeePercentage() external view returns (uint256)",
  "function maintenanceFeePercentage() external view returns (uint256)",
  "function charityAddress() external view returns (address)",
  "function maintenanceAddress() external view returns (address)",

  // State-Changing Functions
  "function createPrediction(string memory _title, string memory _description, uint256 _targetDate, uint256 _targetValue, uint8 _category, string memory _network, string memory _emoji, bool _autoResolvable) external returns (uint256)",
  "function vote(uint256 _predictionId, bool _isYes) external payable",
  "function claimReward(uint256 _predictionId) external",
  "function claimRefund(uint256 _predictionId) external",
  "function autoResolvePrediction(uint256 _predictionId) external",

  // Owner Functions
  "function resolvePrediction(uint256 _predictionId, uint8 _outcome) external",
  "function cancelPrediction(uint256 _predictionId) external",
  "function updatePredictionValue(uint256 _predictionId, uint256 _currentValue) external",
  "function updateFeePercentages(uint256 _newCharityFeePercentage, uint256 _newMaintenanceFeePercentage) external",
  "function updateCharityAddress(address _newCharityAddress) external",
  "function updateMaintenanceAddress(address _newMaintenanceAddress) external",
  "function transferOwnership(address _newOwner) external"
];