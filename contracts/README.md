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

## Deployment Instructions for CELO Mainnet using Remix

### Prerequisites

1. MetaMask or another web3 wallet with CELO tokens
2. Access to [Remix IDE](https://remix.ethereum.org/)
3. Basic understanding of smart contract deployment

### Deployment Steps

1. **Open Remix IDE**

   - Go to [https://remix.ethereum.org/](https://remix.ethereum.org/)

2. **Create Contract Files**

   - Create a new file called `ImperfectFormPredictionMarket.sol` and paste the content from this repository
   - Create a new file called `ImperfectFormPredictionMarketFactory.sol` and paste the content from this repository

3. **Compile the Contracts**

   - Go to the "Solidity Compiler" tab (2nd icon on the left sidebar)
   - Set compiler version to 0.8.17
   - **Important**: Enable the optimizer and IR-based code generator:
     - Click on the "Advanced Configurations" button
     - Check "Enable optimization" and set runs to 200
     - Check "Use the IR-based code generator (viaIR)"
     - Alternatively, you can use the `remix-config.json` file from this repository
   - Click "Compile ImperfectFormPredictionMarket.sol"
   - Click "Compile ImperfectFormPredictionMarketFactory.sol"

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
   - Select "ImperfectFormPredictionMarketFactory" from the contract dropdown
   - Click "Deploy"
   - Confirm the transaction in MetaMask
   - **Important**: Save the factory contract address (e.g., 0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9)

6. **Create a Prediction Market Instance**

   - After the factory is deployed, you'll see it under "Deployed Contracts"
   - Expand the factory contract
   - Click on the "createPredictionMarket" function
   - Confirm the transaction in MetaMask
   - Look for the "PredictionMarketCreated" event in the logs to get the address of the new prediction market
   - **Important**: Save the prediction market address (e.g., 0x28461Aeb1af60D059D9aD07051df4fB70C5C1921)

7. **Save the Contract Addresses**

   - Save both the factory address and the prediction market address
   - You'll need the prediction market address for your frontend integration
   - Add these addresses to your .env file:
     ```
     NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x28461Aeb1af60D059D9aD07051df4fB70C5C1921
     NEXT_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS=0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9
     ```

8. **Important Note on Deployment**
   - You do NOT need to deploy the ImperfectFormPredictionMarket.sol contract directly
   - The factory contract creates instances of the prediction market contract for you
   - Always use the factory to create prediction market instances

### Testing on CELO Testnet (Alfajores) First

Before deploying to mainnet, it's recommended to test on Alfajores testnet:

1. Configure MetaMask for Alfajores:

   - Network Name: Celo Alfajores Testnet
   - RPC URL: https://alfajores-forno.celo-testnet.org
   - Chain ID: 44787
   - Symbol: CELO
   - Block Explorer: https://alfajores-blockscout.celo-testnet.org

2. Get testnet CELO from the faucet:

   - Visit [https://faucet.celo.org/alfajores](https://faucet.celo.org/alfajores)
   - Enter your wallet address
   - Receive testnet CELO

3. Follow the same deployment steps as above, but on the Alfajores network

## Integration with Farcaster Mini App

Farcaster mini apps have specific considerations for blockchain integration. Here's how to integrate these contracts with your Farcaster mini app:

1. **Install Required Dependencies**

```bash
npm install ethers
```

2. **Create a Utility File for Contract Interaction**

```typescript
// lib/prediction-market.ts
import { ethers } from "ethers";

// ABI for the prediction market contract
const PredictionMarketABI = [
  // Events
  "event PredictionCreated(uint256 indexed id, address indexed creator, string title, uint256 targetDate, uint8 category, string network)",
  "event VoteCast(uint256 indexed predictionId, address indexed voter, bool isYes, uint256 amount)",
  "event PredictionResolved(uint256 indexed predictionId, uint8 outcome)",
  "event PredictionUpdated(uint256 indexed predictionId, uint256 currentValue)",
  "event RewardClaimed(uint256 indexed predictionId, address indexed user, uint256 amount)",

  // Functions
  "function createPrediction(string memory _title, string memory _description, uint256 _targetDate, uint256 _targetValue, uint8 _category, string memory _network, string memory _emoji) external returns (uint256)",
  "function vote(uint256 _predictionId, bool _isYes) external payable",
  "function getPrediction(uint256 _predictionId) external view returns (tuple(uint256 id, address creator, string title, string description, uint256 targetDate, uint256 targetValue, uint256 currentValue, uint8 category, string network, string emoji, uint256 totalStaked, uint256 yesVotes, uint256 noVotes, uint8 status, uint8 outcome, uint256 createdAt))",
  "function getUserVote(uint256 _predictionId, address _user) external view returns (tuple(bool isYes, uint256 amount, bool claimed))",
  "function getParticipants(uint256 _predictionId) external view returns (address[])",
  "function getTotalPredictions() external view returns (uint256)",
  "function claimReward(uint256 _predictionId) external",
];

// Replace with your deployed contract address after deployment
const PREDICTION_MARKET_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

// Enum values for categories
export enum PredictionCategory {
  FITNESS = 0,
  CHAIN = 1,
  COMMUNITY = 2,
  CUSTOM = 3,
}

// Connect to provider - optimized for Farcaster embedded wallet environment
export const getProvider = async () => {
  // Check if we're in a Farcaster environment with embedded wallet
  if (typeof window !== "undefined" && window.ethereum) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    return new ethers.providers.Web3Provider(window.ethereum);
  }

  // Fallback to read-only provider
  return new ethers.providers.JsonRpcProvider("https://forno.celo.org");
};

// Get contract instance
export const getPredictionMarketContract = async (writeAccess = false) => {
  const provider = await getProvider();

  // For read-only operations, use provider
  if (!writeAccess) {
    return new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PredictionMarketABI,
      provider
    );
  }

  // For write operations, use signer
  const signer = provider.getSigner();
  return new ethers.Contract(
    PREDICTION_MARKET_ADDRESS,
    PredictionMarketABI,
    signer
  );
};

// Create a prediction
export const createPrediction = async (
  title,
  description,
  targetDate,
  targetValue,
  category,
  network,
  emoji
) => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.createPrediction(
      title,
      description,
      Math.floor(new Date(targetDate).getTime() / 1000),
      targetValue,
      category,
      network,
      emoji
    );
    const receipt = await tx.wait();

    // Get prediction ID from event
    const event = receipt.events?.find((e) => e.event === "PredictionCreated");
    if (event && event.args) {
      return event.args.id.toNumber();
    }
    throw new Error("Failed to get prediction ID from event");
  } catch (error) {
    console.error("Error creating prediction:", error);
    throw error;
  }
};

// Vote on a prediction
export const voteOnPrediction = async (predictionId, isYes, amount) => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.vote(predictionId, isYes, {
      value: ethers.utils.parseEther(amount.toString()),
    });
    return tx.wait();
  } catch (error) {
    console.error("Error voting on prediction:", error);
    throw error;
  }
};

// Get all predictions
export const getAllPredictions = async () => {
  try {
    const contract = await getPredictionMarketContract(false);
    const totalPredictions = await contract.getTotalPredictions();

    const predictions = [];
    for (let i = 1; i <= totalPredictions; i++) {
      const prediction = await contract.getPrediction(i);
      predictions.push(prediction);
    }

    return predictions;
  } catch (error) {
    console.error("Error getting predictions:", error);
    return [];
  }
};

// Claim reward
export const claimReward = async (predictionId) => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.claimReward(predictionId);
    return tx.wait();
  } catch (error) {
    console.error("Error claiming reward:", error);
    throw error;
  }
};
```

3. **Farcaster Mini App UI Considerations**

When integrating with Farcaster mini apps, keep these UI principles in mind:

- **Compact UI**: Farcaster mini apps have limited screen space, so keep the UI compact
- **Quick Interactions**: Users expect fast interactions, minimize steps required
- **Visual Feedback**: Use animations and visual cues for blockchain transactions
- **Error Handling**: Provide clear error messages for failed transactions
- **Loading States**: Show loading indicators during blockchain operations
- **Mobile-First**: Design for mobile screens as most Farcaster users are on mobile

4. **Embedded Wallet Integration**

Farcaster has embedded wallets that simplify the user experience:

```typescript
// Example of handling transactions with appropriate UI feedback
const handleTransaction = async (txPromise, successMessage) => {
  try {
    // Show loading state
    setIsLoading(true);

    // Execute transaction
    await txPromise;

    // Show success animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Show success message
    showNotification(successMessage);

    return true;
  } catch (error) {
    // Show error message
    showNotification(`Transaction failed: ${error.message}`);
    return false;
  } finally {
    setIsLoading(false);
  }
};
```

## Troubleshooting

### "Stack too deep" Error

If you encounter a "Stack too deep" error when compiling the contracts, it's because the `createPrediction` function has many parameters and local variables. This is a limitation of the EVM stack. To fix this:

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

## Security Considerations for Farcaster Mini Apps

1. **Gas Limits**: Keep gas usage low as users may be on mobile with limited patience
2. **Transaction Feedback**: Always provide clear feedback on transaction status
3. **Error Recovery**: Implement robust error handling for failed transactions
4. **Testing**: Test thoroughly on Alfajores testnet before deploying to mainnet
5. **Access Control**: The contract uses `onlyOwner` for sensitive functions - secure this key
6. **User Education**: Provide clear information about what happens when users stake tokens

## License

These contracts are licensed under the MIT License.
