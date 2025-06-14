# 🔧 Technical Guide - SweatEquityBot

## Core Architecture

### Smart Contract
- **Language**: Solidity 0.8.20
- **Security**: OpenZeppelin v5 (ReentrancyGuard, Ownable, ERC721)
- **Network**: Base Mainnet (8453)
- **Address**: `0x89ED0a9739801634A61e791aB57ADc3298B685e9`

### Key Functions
```solidity
contract SweatEquityBot is ERC721, Ownable, ReentrancyGuard {
    uint256 public constant RECOVERABLE_PERCENT = 80;
    uint256 public constant SWEAT_EQUITY_WINDOW = 24 hours;
    
    function createSweatEquityChallenge(
        uint256 predictionId,
        uint8 exerciseType,
        uint256 targetAmount
    ) external;
    
    function getUserCurrentExerciseCount(address user, uint8 exerciseType) 
        external view returns (uint256);
}
```

## Frontend Integration

### Service Layer
```typescript
// lib/sweat-equity-bot-integration.ts
export class SweatEquityBotService {
    constructor(network = "base-mainnet");
    
    async canCreateSweatEquity(predictionId: number, userAddress: string): Promise<boolean>;
    async getUserChallenges(userAddress: string): Promise<number[]>;
    async getChallenge(challengeId: number): Promise<SweatEquityChallenge>;
}
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: Wagmi v2, Viem, ethers.js
- **AI**: AgentKit integration for autonomous verification
- **Styling**: TailwindCSS with custom fitness theme

## Cross-Chain Data

### Supported Networks
- **Base**: Primary deployment
- **CELO**: Cross-chain aggregation
- **Polygon**: Additional data source
- **Monad**: Future expansion

### Exercise Types
- **Type 0**: Pushups
- **Type 1**: Squats

## Testing

### Quick Test
```bash
npm run test:sweat-equity-bot
```

### Manual Testing
```bash
npm install
npm run dev
# Visit: http://localhost:3000
```

## Economic Model

- **80%** recoverable through exercise
- **15%** to fitness charity
- **5%** platform maintenance
- **24 hours** to complete challenge

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Access control for admin functions
- **Input Validation**: All parameters validated
- **Cross-Chain Safety**: Secure data aggregation

## Deployment Info

```json
{
  "network": "base-mainnet",
  "chainId": "8453",
  "contractAddress": "0x89ED0a9739801634A61e791aB57ADc3298B685e9",
  "timestamp": "2025-06-14T05:41:36.863Z",
  "status": "deployed_and_verified"
}
```

## Quick Commands

```bash
# Test deployment
npm run test:sweat-equity-bot

# Verify contract
npm run verify:mainnet

# Start demo
npm run dev
```

**BaseScan**: https://basescan.org/address/0x89ED0a9739801634A61e791aB57ADc3298B685e9#code