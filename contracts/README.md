# Imperfect Form Prediction Market Contracts

This directory contains the smart contracts for the Imperfect Form prediction market functionality, designed specifically for the Farcaster mini app environment and CELO mainnet deployment.

## Contract Overview

### ImperfectFormPredictionMarket.sol

The main prediction market contract that handles:

- Creating predictions
- Voting on predictions with staked tokens
- Resolving predictions
- Claiming rewards for correct predictions

### ImperfectFormPredictionMarketFactory.sol

A factory contract that can deploy multiple prediction market instances if needed.

### interfaces/IImperfectFormPredictionMarket.sol

Interface for the prediction market contract to be used by the frontend.

## Deployment Instructions for V2 Contracts on CELO Mainnet using Remix

### Prerequisites

1. MetaMask or another web3 wallet with CELO tokens
2. Access to [Remix IDE](https://remix.ethereum.org/)
3. Basic understanding of smart contract deployment

### Deployment Steps for V2 Contracts

1. **Open Remix IDE**

   - Go to [https://remix.ethereum.org/](https://remix.ethereum.org/)

2. **Create Contract Files**

   - Create a new file called `ImperfectFormPredictionMarketV2.sol` and paste the content from this repository
   - Create a new file called `ImperfectFormPredictionMarketFactoryV2.sol` and paste the content from this repository
   - If you have interfaces, create those files as well

3. **Compile the Contracts**

   - Go to the "Solidity Compiler" tab (2nd icon on the left sidebar)
   - Set compiler version to 0.8.17
   - **Important**: Enable the optimizer and IR-based code generator:
     - Click on the "Advanced Configurations" button
     - Check "Enable optimization" and set runs to 200
     - Check "Use the IR-based code generator (viaIR)"
     - These settings are crucial for complex contracts to compile successfully
   - Click "Compile ImperfectFormPredictionMarketV2.sol"
   - Click "Compile ImperfectFormPredictionMarketFactoryV2.sol"

4. **Configure MetaMask for CELO**

   - Add CELO Mainnet to MetaMask:
     - Network Name: Celo Mainnet
     - RPC URL: https://forno.celo.org
     - Chain ID: 42220
     - Symbol: CELO
     - Block Explorer: https://explorer.celo.org

5. **Deploy the Factory Contract**

   - Go to the "Deploy & Run Transactions" tab (3rd icon on the left sidebar)
   - Set the environment to "Injected Provider - MetaMask"
   - Make sure MetaMask is connected to CELO Mainnet
   - Select "ImperfectFormPredictionMarketFactoryV2" from the contract dropdown
   - Click "Deploy"
   - Confirm the transaction in MetaMask
   - **Important**: Save the factory contract address (e.g., 0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9)

6. **Create a Prediction Market Instance**

   - After the factory is deployed, you'll see it under "Deployed Contracts"
   - Expand the factory contract
   - Find the "createPredictionMarket" function
   - For the charity address parameter, use the Greenpill Kenya address: 0x0e5DaC01687592597d3e4307cdB7B3B616F2822E
   - For the maintenance address parameter, use your own wallet address or a multisig wallet
   - Click "transact" to execute the function
   - Confirm the transaction in MetaMask
   - Look for the "PredictionMarketCreated" event in the logs to get the address of the new prediction market
   - **Important**: Save the prediction market address (e.g., 0x28461Aeb1af60D059D9aD07051df4fB70C5C1921)

7. **Verify the Deployed Contracts (Optional but Recommended)**

   - Go to the CELO Explorer: https://explorer.celo.org/
   - Search for your factory contract address
   - Click on the "Contract" tab
   - Click "Verify & Publish"
   - Follow the instructions to verify your contract:
     - Select the compiler version (0.8.17)
     - Enable optimizer (200 runs)
     - Enable viaIR
     - Paste the exact source code
     - Verify the contract
   - Repeat for the prediction market contract if needed

8. **Configure Your Frontend**

   - Update your .env file with the new contract addresses:
     ```
     NEXT_PUBLIC_PREDICTION_MARKET_V2_ADDRESS=0x28461Aeb1af60D059D9aD07051df4fB70C5C1921
     NEXT_PUBLIC_PREDICTION_MARKET_FACTORY_V2_ADDRESS=0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9
     ```
   - Make sure your frontend code is using the V2 contract addresses and interfaces

9. **Test the Deployed Contracts**

   - After deployment, interact with your contract through Remix to ensure it works as expected:
     - Create a test prediction
     - Vote on the prediction
     - Check that fees are correctly distributed
   - Only proceed to frontend integration after successful testing

10. **Important Notes on V2 Deployment**
    - The V2 contracts include improved fee distribution mechanisms
    - Charity fees (15%) go directly to Greenpill Kenya
    - Maintenance fees (5%) go to the specified maintenance address
    - The factory owner can update these parameters if needed
    - Always use the factory to create prediction market instances

### Testing V2 Contracts on CELO Testnet (Alfajores) First

Before deploying to mainnet, it's strongly recommended to test on Alfajores testnet:

1. **Configure MetaMask for Alfajores**:

   - Network Name: Celo Alfajores Testnet
   - RPC URL: https://alfajores-forno.celo-testnet.org
   - Chain ID: 44787
   - Symbol: CELO
   - Block Explorer: https://alfajores-blockscout.celo-testnet.org

2. **Get testnet CELO from the faucet**:

   - Visit [https://faucet.celo.org/alfajores](https://faucet.celo.org/alfajores)
   - Enter your wallet address
   - Receive testnet CELO (you'll need at least 1 CELO for deployment and testing)

3. **Deploy the V2 Contracts on Alfajores**:

   - Follow the same deployment steps as above, but select Alfajores network in MetaMask
   - For testing purposes, you can use any address for the charity and maintenance addresses
   - Record the deployed contract addresses for testing

4. **Test All Contract Functions**:

   - Create several test predictions with different parameters
   - Vote on predictions with different amounts
   - Test the fee distribution mechanism
   - Resolve predictions and claim rewards
   - Verify that all functions work as expected

5. **Test Frontend Integration**:

   - Update your frontend code to use the Alfajores testnet contract addresses
   - Test the complete user flow from prediction creation to reward claiming
   - Verify that the UI correctly displays all contract data

6. **Verify Contract Behavior**:

   - Check that the charity fee (15%) is correctly sent to the charity address
   - Verify that the maintenance fee (5%) is correctly sent to the maintenance address
   - Ensure that users can claim rewards only for correct predictions
   - Test edge cases like voting with very small amounts or very large amounts

## Integration with Farcaster Mini App for V2 Contracts

Farcaster mini apps have specific considerations for blockchain integration. Here's how to integrate the V2 contracts with your Farcaster mini app:

1. **Install Required Dependencies**

```bash
npm install ethers@5.7.2
```

Note: We're using ethers v5 for compatibility with most Farcaster mini app templates.

2. **Create a Utility File for V2 Contract Interaction**

```typescript
// lib/prediction-market-v2.ts
"use client";

import { ethers } from "ethers";

// ABI for the prediction market V2 contract
const predictionMarketABI = [
  "function createPrediction(string _title, string _description, uint256 _targetDate, uint256 _targetValue, uint8 _category, string _network, string _emoji) external returns (uint256)",
  "function vote(uint256 _predictionId, bool _isYes) external payable",
  "function updatePredictionValue(uint256 _predictionId, uint256 _currentValue) external",
  "function resolvePrediction(uint256 _predictionId, uint8 _outcome) external",
  "function claimReward(uint256 _predictionId) external",
  "function getPrediction(uint256 _predictionId) external view returns (tuple(uint256 id, address creator, string title, string description, uint256 targetDate, uint256 targetValue, uint256 currentValue, uint8 category, string network, string emoji, uint256 totalStaked, uint256 yesVotes, uint256 noVotes, uint8 status, uint8 outcome, uint256 createdAt))",
  "function getUserVote(uint256 _predictionId, address _user) external view returns (tuple(bool isYes, uint256 amount, bool claimed))",
  "function getParticipants(uint256 _predictionId) external view returns (address[])",
  "function getTotalPredictions() external view returns (uint256)",
  "function autoResolvePrediction(uint256 _predictionId) external",
  "function CHARITY_FEE_PERCENTAGE() external view returns (uint256)",
  "function MAINTENANCE_FEE_PERCENTAGE() external view returns (uint256)",
  "function TOTAL_FEE_PERCENTAGE() external view returns (uint256)",
  "function charityAddress() external view returns (address)",
  "function maintenanceAddress() external view returns (address)",
];

// Deployed prediction market V2 contract address on CELO
const PREDICTION_MARKET_ADDRESS =
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_V2_ADDRESS ||
  "0x28461Aeb1af60D059D9aD07051df4fB70C5C1921";

// Charity address
const CHARITY_ADDRESS = "0x0e5DaC01687592597d3e4307cdB7B3B616F2822E";

// Enum values for categories
export enum PredictionCategory {
  FITNESS = 0,
  CHAIN = 1,
  COMMUNITY = 2,
  CUSTOM = 3,
}

// Enum values for outcomes
export enum PredictionOutcome {
  UNRESOLVED = 0,
  YES = 1,
  NO = 2,
}

// Enum values for status
export enum PredictionStatus {
  ACTIVE = 0,
  RESOLVED = 1,
  CANCELLED = 2,
}

// Type definitions
export interface Prediction {
  id: number;
  creator: string;
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  currentValue: number;
  category: PredictionCategory;
  network: string;
  emoji: string;
  totalStaked: number;
  yesVotes: number;
  noVotes: number;
  status: PredictionStatus;
  outcome: PredictionOutcome;
  createdAt: number;
}

export interface Vote {
  isYes: boolean;
  amount: number;
  claimed: boolean;
}

export interface FeeInfo {
  charityFeePercentage: number;
  maintenanceFeePercentage: number;
  totalFeePercentage: number;
  charityAddress: string;
  maintenanceAddress: string;
}

// Get provider and signer
const getProvider = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to a public RPC
  return new ethers.JsonRpcProvider("https://forno.celo.org");
};

// Get prediction market contract
const getPredictionMarketContract = async (requireSigner = false) => {
  const provider = getProvider();

  if (requireSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      predictionMarketABI,
      signer
    );
  }

  return new ethers.Contract(
    PREDICTION_MARKET_ADDRESS,
    predictionMarketABI,
    provider
  );
};

// Get fee information
export const getFeeInfo = async (): Promise<FeeInfo> => {
  try {
    const contract = await getPredictionMarketContract();

    const [
      charityFeePercentage,
      maintenanceFeePercentage,
      totalFeePercentage,
      charityAddress,
      maintenanceAddress,
    ] = await Promise.all([
      contract.CHARITY_FEE_PERCENTAGE(),
      contract.MAINTENANCE_FEE_PERCENTAGE(),
      contract.TOTAL_FEE_PERCENTAGE(),
      contract.charityAddress(),
      contract.maintenanceAddress(),
    ]);

    return {
      charityFeePercentage: Number(charityFeePercentage),
      maintenanceFeePercentage: Number(maintenanceFeePercentage),
      totalFeePercentage: Number(totalFeePercentage),
      charityAddress,
      maintenanceAddress,
    };
  } catch (error) {
    console.error("Error getting fee info:", error);
    // Return default values if contract call fails
    return {
      charityFeePercentage: 15,
      maintenanceFeePercentage: 5,
      totalFeePercentage: 20,
      charityAddress: CHARITY_ADDRESS,
      maintenanceAddress: PREDICTION_MARKET_ADDRESS,
    };
  }
};

// Get all predictions
export const getAllPredictions = async (): Promise<Prediction[]> => {
  try {
    const contract = await getPredictionMarketContract();
    const totalPredictions = await contract.getTotalPredictions();

    const predictions: Prediction[] = [];

    for (let i = 1; i <= totalPredictions; i++) {
      try {
        const prediction = await contract.getPrediction(i);

        predictions.push({
          id: Number(prediction.id),
          creator: prediction.creator,
          title: prediction.title,
          description: prediction.description,
          targetDate: Number(prediction.targetDate),
          targetValue: Number(prediction.targetValue),
          currentValue: Number(prediction.currentValue),
          category: prediction.category,
          network: prediction.network,
          emoji: prediction.emoji,
          totalStaked: Number(ethers.formatEther(prediction.totalStaked)),
          yesVotes: Number(ethers.formatEther(prediction.yesVotes)),
          noVotes: Number(ethers.formatEther(prediction.noVotes)),
          status: prediction.status,
          outcome: prediction.outcome,
          createdAt: Number(prediction.createdAt),
        });
      } catch (error) {
        console.error(`Error fetching prediction ${i}:`, error);
      }
    }

    return predictions;
  } catch (error) {
    console.error("Error getting all predictions:", error);
    return [];
  }
};

// Vote on a prediction
export const voteOnPrediction = async (
  predictionId: number,
  isYes: boolean,
  amount: number
): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.vote(predictionId, isYes, {
      value: ethers.parseEther(amount.toString()),
    });
    await tx.wait();
  } catch (error) {
    console.error("Error voting on prediction:", error);
    throw error;
  }
};

// Claim reward
export const claimReward = async (predictionId: number): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.claimReward(predictionId);
    await tx.wait();
  } catch (error) {
    console.error("Error claiming reward:", error);
    throw error;
  }
};

// Calculate odds
export const calculateOdds = (
  yesVotes: number,
  noVotes: number
): { yes: number; no: number } => {
  const total = yesVotes + noVotes;
  if (total === 0) return { yes: 50, no: 50 };

  const yesPercentage = Math.round((yesVotes / total) * 100);
  return {
    yes: yesPercentage,
    no: 100 - yesPercentage,
  };
};
```

3. **Farcaster Mini App UI Considerations for V2**

When integrating V2 contracts with Farcaster mini apps, keep these UI principles in mind:

- **Highlight Charity Impact**: Prominently display the 15% charity contribution to Greenpill Kenya
- **Network-Specific UI**: Use different colors for different networks (Celo-yellow, Polygon-purple, Base-blue, Monad-black)
- **Compact UI**: Farcaster mini apps have limited screen space, so keep the UI compact
- **Quick Interactions**: Users expect fast interactions, minimize steps required
- **Visual Feedback**: Use animations and visual cues for blockchain transactions
- **Error Handling**: Provide clear error messages for failed transactions
- **Loading States**: Show loading indicators during blockchain operations
- **Mobile-First**: Design for mobile screens as most Farcaster users are on mobile

4. **Embedded Wallet Integration for V2**

Farcaster has embedded wallets that simplify the user experience. Here's how to handle transactions with the V2 contracts:

```typescript
// Example of handling V2 contract transactions with appropriate UI feedback
const handleTransaction = async (
  txPromise: Promise<any>,
  successMessage: string
) => {
  try {
    // Show loading state
    setIsLoading(true);

    // Execute transaction
    await txPromise;

    // Show success animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Show success message
    toast.success(successMessage);

    return true;
  } catch (error: any) {
    // Show error message
    console.error("Transaction error:", error);
    toast.error(`Transaction failed: ${error.message || "Unknown error"}`);
    return false;
  } finally {
    setIsLoading(false);
  }
};
```

## Troubleshooting V2 Contracts

### "Stack too deep" Error

If you encounter a "Stack too deep" error when compiling the V2 contracts, it's because the `createPrediction` function has many parameters and local variables. This is a limitation of the EVM stack. To fix this:

1. Make sure you've enabled the optimizer and IR-based code generator as mentioned in the compilation steps
2. If you're using Hardhat or Truffle, add these settings to your configuration file:

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
};
```

### "Out of Gas" Errors

The V2 contracts include more complex fee distribution logic which may require more gas. If you encounter "out of gas" errors:

1. Increase the gas limit in your transaction
2. For Farcaster mini apps, consider adding a gas buffer:

```typescript
const tx = await contract.vote(predictionId, isYes, {
  value: ethers.parseEther(amount.toString()),
  gasLimit: 300000, // Increase this value if needed
});
```

### Fee Distribution Issues

If you're not seeing the correct fee distribution:

1. Verify that the charity and maintenance addresses are correctly set during deployment
2. Check that the fee percentages are correctly configured (15% charity, 5% maintenance)
3. Ensure that the total fee percentage (20%) is correctly set

### Contract Verification Issues

If you have trouble verifying the V2 contracts on CELO Explorer:

1. Make sure you're using exactly the same compiler version (0.8.17)
2. Enable the same optimizer settings (200 runs)
3. Enable viaIR
4. Include all imported files in the verification process
5. If using flattened code, ensure all license identifiers are consistent

## Security Considerations for V2 Contracts in Farcaster Mini Apps

1. **Fee Distribution**: The V2 contracts automatically distribute fees to charity and maintenance addresses
2. **Gas Limits**: Keep gas usage low as users may be on mobile with limited patience
3. **Transaction Feedback**: Always provide clear feedback on transaction status
4. **Error Recovery**: Implement robust error handling for failed transactions
5. **Testing**: Test thoroughly on Alfajores testnet before deploying to mainnet
6. **Access Control**: The contract uses `onlyOwner` for sensitive functions - secure this key
7. **User Education**: Provide clear information about fee distribution (15% to charity, 5% for maintenance)
8. **Upgrade Path**: Consider how you'll handle future upgrades if needed

## License

These contracts are licensed under the MIT License.
