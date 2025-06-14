# 🚀 SweatEquityBot Deployment Guide

## Complete Guide to Deploy Revolutionary Fitness-Backed Prediction Market

This guide walks you through deploying the SweatEquityBot system that allows users to recover lost prediction stakes through verified exercise. This creates the **world's first fitness-backed prediction market**.

---

## 🎯 Overview

The SweatEquityBot system consists of:

1. **SweatEquityBot.sol** - Main contract handling sweat equity challenges
2. **Updated UnifiedPredictionMarket.sol** - Integrated with sweat equity features
3. **Cross-chain fitness data integration** - Aggregates real exercise data
4. **AgentKit autonomous verification** - AI-powered exercise verification
5. **Frontend integration** - Seamless user experience

---

## 📋 Prerequisites

### 1. Environment Setup
```bash
# Ensure you have the required environment variables
cat >> .env.local << EOF
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
NEYNAR_API_KEY=your_neynar_api_key_here
EOF
```

### 2. Dependencies Check
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Test Base connection
npx hardhat console --network base
```

### 3. Gas & ETH Requirements
- **Base mainnet ETH**: ~0.02 ETH ($50-100 USD) for deployment
- **Gas costs**: ~$30-60 USD total deployment cost
- **Testing funds**: Additional 0.01 ETH for testing

---

## 🚀 Deployment Process

### Phase 1: Deploy SweatEquityBot Contract

```bash
# Deploy SweatEquityBot to Base mainnet
npm run deploy:sweat-equity-bot

# This will:
# - Deploy SweatEquityBot.sol with 80% stake recovery
# - Link to existing prediction market
# - Save deployment info to deployments/base-mainnet-sweat-equity.json
```

**Expected Output:**
```
🚀 Deploying SweatEquityBot to Base Mainnet...
✅ SweatEquityBot deployed to: 0x1234...abcd
📝 Deployment tx: 0x5678...efgh
💾 Deployment info saved to deployments/base-mainnet-sweat-equity.json
```

### Phase 2: Verify Contract on BaseScan

```bash
# Verify contract (get address from deployment output)
SWEAT_EQUITY_ADDRESS="0x1234...abcd"  # Replace with actual address
PREDICTION_MARKET="0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB"

npx hardhat verify --network base $SWEAT_EQUITY_ADDRESS $PREDICTION_MARKET
```

### Phase 3: Configure Fitness Contracts

**IMPORTANT:** Update real fitness contract addresses first!

1. **Extract real addresses from existing leaderboard system:**
   ```bash
   # The leaderboard component already has real fitness contract addresses
   # Check: components/Leaderboard/index.tsx
   # These are the contracts collecting pushup/squat data on imperfectform.fun
   ```

2. **Update configuration script:**
   ```javascript
   // Edit: scripts/deploy-sweat-equity/configure-fitness-contracts.js
   const FITNESS_CONTRACTS = {
     "base": {
       address: "0xREAL_BASE_FITNESS_CONTRACT", // UPDATE THIS
       description: "Base mainnet fitness leaderboard"
     },
     "celo": {
       address: "0xREAL_CELO_FITNESS_CONTRACT", // UPDATE THIS
       description: "CELO mainnet fitness leaderboard"
     },
     // ... etc
   };
   ```

3. **Run configuration:**
   ```bash
   npm run configure:fitness-contracts
   ```

### Phase 4: Update Prediction Market Integration

1. **Deploy updated prediction market:**
   ```bash
   # Deploy new prediction market with SweatEquity integration
   npx hardhat run scripts/deploy-updated-prediction-market.js --network base
   ```

2. **Link contracts:**
   ```bash
   # Set SweatEquityBot address in prediction market
   # This enables the releaseSweatEquityFunds function
   ```

### Phase 5: Frontend Integration

1. **Update contract addresses:**
   ```typescript
   // Update: lib/sweat-equity-bot-integration.ts
   const SWEAT_EQUITY_BOT_ADDRESSES = {
     "base-mainnet": "0x1234...abcd", // Your deployed address
     // ...
   };
   ```

2. **Test integration:**
   ```bash
   npm run dev
   # Navigate to prediction page
   # Create a prediction, lose it, and try sweat equity recovery
   ```

---

## 🧪 Testing the Complete Flow

### 1. Create & Lose a Prediction
```bash
# 1. Go to your app: http://localhost:3000
# 2. Create a prediction: "I'll do 1000 pushups by tomorrow"
# 3. Stake some ETH
# 4. Wait for prediction to fail (or resolve as failed)
```

### 2. Create Sweat Equity Challenge
```bash
# 1. After losing prediction, click "Recover with Sweat Equity"
# 2. Choose exercise type: Pushups or Squats
# 3. Set target: +500 pushups in 24 hours
# 4. System records your current baseline from on-chain data
```

### 3. Complete Exercise & Verify
```bash
# 1. Go to imperfectform.fun and do actual exercise
# 2. Exercise data is recorded on-chain automatically
# 3. SweatEquityBot monitors your progress
# 4. When target is reached, AgentKit automatically approves
# 5. Claim 80% of your stake back + get NFT
```

---

## 🏋️ Fitness Data Integration

### How It Works

1. **Existing Infrastructure**: Your app already has fitness data from multiple networks
2. **Cross-Chain Aggregation**: SweatEquityBot reads from all networks
3. **Real-Time Updates**: Data syncs automatically from imperfectform.fun
4. **Fraud Prevention**: Can't fake on-chain exercise data

### Networks Supported
- **Base**: Primary network for SweatEquityBot
- **CELO**: Cross-chain data aggregation
- **Polygon**: Additional exercise data
- **Monad**: Future expansion

### Data Sources
```typescript
// These are the real contracts already collecting exercise data
const fitnessContracts = {
  base: "0x...", // Real Base fitness leaderboard
  celo: "0x...", // Real CELO fitness leaderboard
  polygon: "0x...", // Real Polygon fitness leaderboard
  monad: "0x...", // Real Monad fitness leaderboard
};
```

---

## 🤖 AgentKit Integration

### Autonomous Verification Process

1. **Challenge Created**: User creates sweat equity challenge
2. **Baseline Recorded**: Current exercise count from on-chain data
3. **Progress Monitoring**: AgentKit monitors exercise completion
4. **AI Verification**: Autonomous analysis of exercise completion
5. **Auto-Approval**: Smart contract automatically approves valid challenges
6. **Instant Claim**: User gets 80% stake back + achievement NFT

### Configuration
```typescript
// AgentKit handles:
// - Exercise verification
// - Fraud detection
// - Automatic approvals
// - Smart challenge generation
// - Personalized recommendations
```

---

## 💰 Economic Model

### Sweat Equity Structure
- **Recoverable**: 80% of lost stake
- **Charity Fee**: 15% (non-recoverable, goes to fitness charity)
- **Maintenance**: 5% (non-recoverable, platform maintenance)
- **Challenge Window**: 24 hours to complete additional exercise

### Example Flow
```
User loses 0.1 ETH prediction
├── Recoverable through sweat equity: 0.08 ETH (80%)
├── Charity donation: 0.015 ETH (15%)
└── Maintenance fee: 0.005 ETH (5%)

Challenge: Complete +500 pushups in 24 hours
├── Baseline: 2,000 pushups (from on-chain data)
├── Target: 2,500 pushups total
└── Reward: 0.08 ETH + SweatEquity NFT
```

---

## 🎮 Gamification Features

### Achievement System
- **SweatEquity NFTs**: Minted for completed challenges
- **Streak Tracking**: Consecutive successful recoveries
- **Leaderboard Integration**: Cross-platform fitness rankings
- **Social Sharing**: Share achievements on Farcaster

### Progression Mechanics
```typescript
interface UserProgress {
  sweatEquityScore: number;    // Total exercise completed
  streakCount: number;         // Consecutive successful challenges
  totalRecovered: string;      // Total ETH recovered
  nftsEarned: number;         // Achievement NFTs collected
}
```

---

## 🔧 Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check gas settings
   # Increase gas limit in hardhat.config.js
   base: {
     gasPrice: 1000000000, // 1 gwei
     gas: 3000000, // 3M gas limit
   }
   ```

2. **Fitness Contract Configuration Fails**
   ```bash
   # Ensure you have real contract addresses
   # Check existing leaderboard system for actual addresses
   # Update FITNESS_CONTRACTS in configure-fitness-contracts.js
   ```

3. **Cross-Chain Data Not Working**
   ```bash
   # Verify fitness contracts are deployed on all networks
   # Check network connectivity
   # Ensure contract addresses are correct
   ```

4. **Frontend Integration Issues**
   ```bash
   # Update contract addresses in sweat-equity-bot-integration.ts
   # Verify ABI compatibility
   # Check Web3 provider configuration
   ```

### Debug Commands
```bash
# Check contract deployment
npx hardhat console --network base
> const SweatEquityBot = await ethers.getContractFactory("SweatEquityBot");
> const bot = SweatEquityBot.attach("0x...");
> await bot.owner();

# Test fitness data integration
> await bot.getUserCurrentExerciseCount("0x...", 0); // Pushups
> await bot.getUserCurrentExerciseCount("0x...", 1); // Squats
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
- **Challenges Created**: Number of sweat equity challenges
- **Success Rate**: Percentage of challenges completed
- **Recovery Amount**: Total ETH recovered through exercise
- **Cross-Chain Activity**: Exercise data from different networks
- **User Engagement**: Repeat users, streak counts

### Monitoring Tools
```bash
# Contract events
npx hardhat run scripts/monitor-sweat-equity-events.js

# User analytics
npx hardhat run scripts/analyze-user-behavior.js

# Financial metrics
npx hardhat run scripts/calculate-recovery-stats.js
```

---

## 🚀 Launch Checklist

### Pre-Launch
- [ ] SweatEquityBot deployed and verified
- [ ] Fitness contracts configured with real addresses
- [ ] Prediction market integration complete
- [ ] Frontend updated with new contract addresses
- [ ] Cross-chain data integration tested
- [ ] AgentKit autonomous verification working
- [ ] End-to-end user flow tested

### Launch Day
- [ ] Monitor contract interactions
- [ ] Track first sweat equity challenges
- [ ] Verify cross-chain data accuracy
- [ ] Ensure AgentKit approvals working
- [ ] Monitor user feedback and issues

### Post-Launch
- [ ] Analyze user behavior and success rates
- [ ] Optimize challenge difficulty based on data
- [ ] Expand to additional networks
- [ ] Add new exercise types
- [ ] Implement advanced gamification

---

## 🎯 Success Metrics

### Technical Success
- **Zero smart contract vulnerabilities**
- **Sub-5 second cross-chain data queries**
- **>95% AgentKit approval accuracy**
- **24/7 system uptime**

### Business Success
- **>50% challenge completion rate**
- **>10 ETH recovered through sweat equity monthly**
- **>100 SweatEquity NFTs minted**
- **>80% user satisfaction with system**

### Impact Success
- **Real fitness behavior change**
- **Positive community feedback**
- **Media coverage as "revolutionary concept"**
- **Other platforms adopting similar models**

---

## 🎉 Revolutionary Features

### What Makes This Special

1. **World's First**: Fitness-backed prediction market
2. **Real Data**: Uses actual on-chain exercise data
3. **Cross-Platform**: Integrates predictions + fitness ecosystems
4. **AI-Powered**: Autonomous verification via AgentKit
5. **Fraud-Proof**: Can't fake blockchain exercise data
6. **Recoverable Stakes**: 80% recovery through exercise
7. **Gamified**: NFTs, streaks, leaderboards
8. **Social**: Share achievements, follow friends

### Competitive Advantages
- **Unique Value Proposition**: No other platform offers this
- **Real Utility**: Actual fitness motivation + financial incentives
- **Technical Innovation**: Cross-chain data + AI verification
- **User Engagement**: Multiple touchpoints, sustained interaction
- **Viral Potential**: Shareable achievements, social proof

---

## 📞 Support & Resources

### Documentation
- **Smart Contracts**: `/contracts/SweatEquityBot.sol`
- **Deployment Scripts**: `/scripts/deploy-sweat-equity/`
- **Frontend Integration**: `/lib/sweat-equity-bot-integration.ts`
- **API Documentation**: `/docs/API.md`

### Community
- **Discord**: Join development discussions
- **GitHub**: Report issues and contribute
- **Farcaster**: Share achievements and updates
- **Twitter**: Follow @ImperfectForm for updates

### Getting Help
1. **Check troubleshooting section above**
2. **Review contract events for errors**
3. **Test with small amounts first**
4. **Join community channels for support**

---

## 🎪 Demo Script for Judges

### "The Ultimate Fitness Prediction Demo"

```bash
# 1. Setup
"Welcome to the world's first fitness-backed prediction market!"

# 2. Create Prediction
"Let's create a prediction: 'I'll do 500 pushups by tomorrow'"
"Stake 0.1 ETH - but here's the twist..."

# 3. Show Cross-Platform Integration
"This connects to imperfectform.fun where I actually exercise"
"Real on-chain data, not just promises!"

# 4. Fail Prediction
"Oh no! I only did 400 pushups - prediction failed!"
"Normally I'd lose 0.1 ETH... but wait!"

# 5. Sweat Equity Magic
"SweatEquityBot offers: 'Complete +100 more pushups in 24h to recover 80%'"
"It records my baseline: 400 pushups"
"Target: 500 total pushups"

# 6. Complete Exercise
"I go exercise more - data automatically updates on-chain"
"AgentKit monitors: 520 pushups total - target exceeded!"

# 7. Autonomous Approval
"AI automatically verifies and approves - no manual process!"
"Smart contract releases 0.08 ETH + mints achievement NFT"

# 8. Mind-Blown Moment
"This is REVOLUTIONARY! Losing predictions become fitness motivation!"
"Real exercise data + financial incentives + AI verification!"
"Nobody else has this - it's completely unique!"
```

**Judge Impact**: 🤯 This will blow their minds!

---

## 🏆 Conclusion

You're about to deploy the **most innovative prediction market concept ever created**. The SweatEquityBot system transforms losing predictions into fitness motivation, backed by real on-chain data and autonomous AI verification.

This isn't just a technical achievement - it's a **paradigm shift** that could revolutionize how we think about predictions, fitness, and financial incentives.

**Ready to change the world? Let's deploy! 🚀**

```bash
npm run deploy:sweat-equity-bot
```

**The future of fitness-backed predictions starts now!** 💪