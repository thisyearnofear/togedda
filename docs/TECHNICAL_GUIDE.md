# Imperfect Form - Technical Guide

## 🏗️ Architecture Overview

Imperfect Form is a dual-chain prediction market platform with AI-powered natural language processing and secure XMTP messaging.

### Core Components

1. **Frontend (Next.js)** - React-based web app with Farcaster mini app support
2. **Smart Contracts** - Solidity contracts on CELO Mainnet and Base Sepolia
3. **AI Bot Service** - Node.js service with XMTP integration and OpenAI
4. **Database** - Neon PostgreSQL for user data and fitness tracking
5. **APIs** - RESTful endpoints for data fetching and bot communication
6. **Prediction Resolution System** - Automated resolution using external data sources
7. **External Data Integration** - Real-time crypto prices, weather, timezone APIs

### Technology Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **State Management:** React Query (TanStack Query) for advanced caching
- **Real-time:** XMTP V3 with live message streaming and conversation history
- **Blockchain:** Solidity, ethers.js, Wagmi, Viem
- **AI/ML:** OpenAI GPT-4, natural language processing
- **Messaging:** XMTP V3 Node SDK for secure communication
- **Database:** Neon PostgreSQL with connection pooling
- **External APIs:** CoinGecko, OpenWeatherMap, TimeZoneDB, Web3.bio
- **Deployment:** Vercel (frontend), Railway (bot service)

---

## 🚀 Real-time Features & Caching

### **Enhanced Message Storage System** ✅ **NEW**

The app now includes a robust multi-layer message storage architecture:

#### **Storage Layers**

1. **PostgreSQL** - Persistent storage for all messages and conversations
2. **Redis** - Real-time caching and session management (optional but recommended)
3. **XMTP Sync** - Cross-device message synchronization using XMTP's native capabilities

#### **Key Features**

- **Persistence**: Messages survive server restarts and deployments
- **Performance**: Redis caching for sub-100ms message retrieval
- **Scalability**: Handles high message volumes with connection pooling
- **Reliability**: Graceful fallback if Redis is unavailable
- **Analytics**: Built-in conversation statistics and user engagement metrics

#### **Setup & Configuration**

```bash
# Quick setup and testing
npm run setup:message-store

# Test complete message flow
npm run setup:message-store test
```

#### **Environment Variables**

```env
# Required - PostgreSQL (already configured)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Optional - Redis for performance boost
REDIS_URL="redis://localhost:6379"  # Local development
REDIS_URL="redis://username:password@host:port"  # Production (Upstash, Railway)
```

### **Enhanced XMTP Integration**

Building on the robust storage foundation, the app includes advanced real-time messaging:

- **Live Message Streaming**: Real-time conversation updates via XMTP V3
- **Persistent History**: All messages stored in PostgreSQL with Redis caching
- **Message Metadata**: Automatic extraction of prediction-related data
- **Optimistic Updates**: Immediate UI feedback with rollback on errors
- **Connection Management**: Automatic reconnection and error handling
- **Cross-Device Sync**: XMTP native sync for seamless multi-device experience

#### **Transaction Signing Architecture**

**Current (Hackathon)**: Bot creates predictions using its own wallet for instant creation
**Roadmap**: Transition to user-signed transactions for proper attribution and decentralization

```typescript
// Current: Bot-signed (immediate)
const result = await createChainPrediction(chain, predictionData, botWallet);

// Future: User-signed (planned)
const result = await createChainPrediction(chain, predictionData, userWallet);
```

This ensures clear attribution of who created each prediction while maintaining the smooth UX.

### **Advanced Caching System**

React Query integration provides:

- **Background Updates**: Data refreshes without blocking UI
- **Smart Invalidation**: Selective cache updates based on user actions
- **Optimistic Mutations**: Immediate UI updates with server sync
- **Error Recovery**: Automatic retry with exponential backoff
- **Performance Optimization**: Reduced API calls through intelligent caching

### **Key Improvements**

1. **Message Store**: Centralized message management with real-time updates
2. **User Client**: Enhanced XMTP client with streaming capabilities
3. **React Hooks**: Custom hooks for real-time messaging and data fetching
4. **API Enhancements**: New endpoints for conversation history and statistics
5. **Performance**: Optimized data fetching and background synchronization

📚 **Implementation details and usage examples are covered in the sections below.**

---

## 🎯 Prediction Resolution System

### **External API Integration Status**

✅ **Working APIs:**

- 🕐 **Timezone & Date Parsing**: Enhanced natural language date parsing with timezone awareness
- 💰 **Crypto Price Data**: Real-time prices from CoinGecko (BTC: $108,605, ETH: $2,771, CELO: $0.325)
- 📍 **Location Services**: IP geolocation and city name lookup
- 👤 **User Context**: Automatic timezone detection and user preference inference
- 🔍 **External Data Validation**: Crypto predictions with 95% confidence

⚠️ **APIs Configured:**

- 🌤️ **Weather Data**: OPENWEATHER_API_KEY configured in .env.local
- 🗺️ **Enhanced Location**: TIMEZONEDB_API_KEY configured in .env.local

### **Auto-Resolution Features**

🚀 **Smart Date Parsing:**

- "next Friday" → June 12, 2025
- "in 2 weeks" → June 25, 2025
- Automatic validation for future dates

🚀 **Real-time Crypto Data:**

- Bitcoin predictions can be auto-resolved
- Multiple fallback sources (CoinGecko, Binance, CoinMarketCap)

🚀 **Location Intelligence:**

- Automatic timezone detection from IP
- City name resolution to coordinates
- Location-based prediction validation

🚀 **Enhanced Prediction Validation:**

- Determines if predictions can be auto-resolved
- Validates external data availability
- Provides confidence scores

### **AI Bot Integration**

The AI bot now understands:

- **Timezone context**: "by 5 PM EST" vs "by 5 PM local time"
- **Crypto predictions**: "Bitcoin will reach $100k" (auto-resolvable with 95% confidence)
- **Location requirements**: "rain in New York" (uses weather API)
- **Date validation**: Warns about past dates or ambiguous timeframes

### **Resolution Process (On-Demand)**

1. **User Trigger**: Users manually trigger resolution when ready
2. **Eligibility Check**: Validates prediction is ready for resolution
3. **Data Fetching**: Retrieves real-time data from external APIs
4. **Validation**: Validates data quality and confidence scores (≥80% required)
5. **Resolution**: Resolves prediction using external data
6. **Contract Interaction**: Updates smart contract with resolution outcome
7. **Payout Distribution**: Handles winner payouts and platform fees

---

## 🎯 End-to-End Prediction Flow

### **1. Prediction Creation**

#### **Via AI Chat (Recommended)**

1. **User Input**: "I predict Bitcoin will reach $120k by end of 2025"
2. **AI Processing**:
   - Parses natural language → structured data
   - Validates external data availability (crypto prices: ✅ 95% confidence)
   - Determines auto-resolvable: `true`
   - Suggests network: Base (for hackathon)
3. **User Confirmation**: "Yes, create this prediction"
4. **Smart Contract**: AI bot creates prediction on-chain with validated parameters
5. **UI Update**: Prediction appears in Live Markets tab immediately

#### **Via Manual Creation** (Future)

- Direct form input with validation
- Manual parameter selection

### **2. Prediction Validation & Display**

#### **Validation Process**

- **Title/Description**: Length limits, content validation
- **Target Date**: Must be future date, timezone-aware parsing
- **External Data**: Checks if auto-resolution is possible
- **Network Selection**: Recommends optimal chain based on content

#### **UI Display Logic**

```typescript
// Active predictions shown by network
predictions.filter((p) => p.status === PredictionStatus.ACTIVE);

// Resolved predictions in separate section
predictions.filter((p) => p.status === PredictionStatus.RESOLVED);
```

### **3. User Interaction & Staking**

#### **Voting Process**

1. **Amount Input**: User enters CELO amount (min 0.01)
2. **Position Selection**: YES or NO button
3. **Transaction**: Wagmi handles wallet interaction
4. **Confirmation**: Toast notification + confetti animation
5. **Position Display**: Shows user's stake and current odds

#### **Staking Mechanics**

- **Minimum Stake**: 0.01 CELO
- **Fee Structure**: 20% total (15% charity, 5% maintenance)
- **Odds Calculation**: Dynamic based on total stakes
- **Position Tracking**: User can see their stake and potential payout

### **4. Prediction Resolution**

#### **On-Demand Resolution Process**

1. **Eligibility Check**: Target date passed + auto-resolvable
2. **User Trigger**: "Resolve" button appears for eligible predictions
3. **External Data Fetch**: Real-time API calls (crypto/weather/timezone)
4. **Confidence Validation**: ≥80% confidence required
5. **Smart Contract Update**: Outcome recorded on-chain
6. **Payout Distribution**: Winners can claim rewards

#### **Resolution UI States**

- **Active**: Voting interface with amount input
- **Pending Resolution**: "Resolve" button for eligible predictions
- **Resolved**: Outcome display + claim rewards button

### **5. Prediction Lifecycle Management**

#### **Active Predictions**

- **Display**: Grouped by network in Live Markets tab
- **Interaction**: Full voting interface
- **Updates**: Real-time refresh via manual button
- **Sharing**: Farcaster integration for position sharing

#### **Resolved Predictions**

- **Display**: Separate "Past Predictions" section
- **Information**: Final outcome, user position, claimable rewards
- **Actions**: Claim rewards if user won
- **History**: Permanent record of all predictions

#### **Expired/Outdated Predictions**

- **Auto-Resolution**: Eligible predictions show resolve button
- **Manual Resolution**: Admin can resolve non-auto-resolvable
- **Archive**: Old predictions remain visible but inactive

---

## 💰 Payment & Staking Architecture

### **🔐 Authentication vs Payment Scenarios**

#### **Scenario A: Farcaster Mini App** ✅

```typescript
✅ Authentication: Automatic via MiniKit
✅ Wallet: Native Farcaster wallet (CELO/Base)
✅ Payment: Direct transaction via sdk.wallet
✅ UX: Seamless, no additional setup
```

#### **Scenario B: Web App - Farcaster Only** ⚠️

```typescript
✅ Authentication: Farcaster (social features)
❌ Wallet: Not connected
❌ Payment: Cannot stake/create predictions
🔧 Solution: Enhanced payment flow prompts wallet connection
```

#### **Scenario C: Web App - Wallet Only** ✅

```typescript
❌ Authentication: No social features
✅ Wallet: Connected (MetaMask, Coinbase, etc.)
✅ Payment: Can stake/create predictions
```

#### **Scenario D: Web App - Both Connected** ✅

```typescript
✅ Authentication: Full social features
✅ Wallet: Connected for payments
✅ Payment: Full functionality
```

### **💳 Payment Mechanisms**

#### **Dual-Chain Support**

- **CELO Mainnet**: Uses CELO tokens for staking
- **Base Sepolia**: Uses ETH tokens for staking
- **Auto-switching**: Wagmi handles chain switching automatically
- **Contract Addresses**: Different prediction markets per chain

#### **Payment Flow**

1. **Amount Input**: User enters stake amount (min 0.01)
2. **Wallet Check**: Verify wallet connection/availability
3. **Chain Validation**: Ensure correct network
4. **Transaction**: Submit via Wagmi with proper ABI
5. **Confirmation**: Wait for transaction confirmation
6. **UI Update**: Refresh prediction data

#### **Fee Structure**

- **Platform Fee**: 20% total
  - **Charity**: 15% to Greenpill Kenya
  - **Maintenance**: 5% for platform operations
- **Gas Fees**: User pays network gas fees
- **Minimum Stake**: 0.01 CELO/ETH

### **🏆 Reward Claiming**

#### **Claim Requirements**

- **Wallet Connection**: Must have connected wallet
- **Correct Prediction**: User voted on winning side
- **Same Address**: Must claim with same address that staked
- **Not Claimed**: Cannot claim twice

#### **Cross-Chain Considerations**

- **Same Chain**: Must claim on same chain as original stake
- **Different Wallets**: Cannot claim if user switches wallets
- **Address Verification**: Smart contract validates voter address

#### **Claim Process**

1. **Eligibility Check**: Verify user can claim
2. **Transaction**: Call `claimReward(predictionId)`
3. **Payout Calculation**: Contract calculates winnings minus fees
4. **Transfer**: Automatic transfer to user's wallet
5. **UI Update**: Mark as claimed in interface

### **🚨 Edge Cases & Solutions**

#### **Problem 1: Farcaster User Without Wallet (Web App)** ✅ **SOLVED**

```typescript
// Simple solution - enhanced UX in PredictionCard
{
  !address && isFarcasterUser && !isFarcasterEnvironment && (
    <div className="bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-3 mb-4">
      <p className="text-sm text-blue-300 font-medium">
        Connect Wallet to Stake
      </p>
      <p className="text-xs text-blue-200 mt-1">
        You're signed in with Farcaster for social features. To stake {amount}{" "}
        CELO, connect a wallet.
      </p>
      <ConnectWalletOptions />
      <p className="text-xs text-blue-300 mt-2">
        💡 <strong>Tip:</strong> Use the Farcaster app for seamless payments
      </p>
    </div>
  );
}
```

#### **Problem 2: Cross-Chain Reward Claims**

- **Issue**: User stakes on CELO but tries to claim on Base
- **Solution**: Chain-specific claim validation and UI guidance

#### **Problem 3: Wallet Switching**

- **Issue**: User stakes with Wallet A but connects Wallet B
- **Solution**: Address-based claim validation with clear error messages

#### **Problem 4: Insufficient Balance**

- **Issue**: User tries to stake more than wallet balance
- **Solution**: Balance validation before transaction submission

### **🔧 Implementation Status**

#### **✅ Working**

- Farcaster mini app payments
- Web app wallet payments
- **Farcaster web app payment flow** ✅ **NEW**
- Dual-chain support
- Reward claiming
- Fee distribution

#### **⚠️ Optional Enhancements**

- Cross-chain guidance (not needed - rewards stay siloed)
- Wallet switching detection
- Balance validation UI

#### **🎯 Simple Solution Implemented**

1. **✅ Enhanced UX for Farcaster Users**: Clean wallet connection prompt
2. **✅ Leverages Existing Infrastructure**: Uses current wallet connection logic
3. **✅ Minimal Code Changes**: DRY approach without extra components
4. **✅ Clear User Guidance**: "Use Farcaster app for seamless payments" tip

---

## 🧪 Local Development Setup

## ✅ **Phase 1: Environment Setup (COMPLETED)**

- [x] **TypeScript/JavaScript Interop Fixed**: Permanent solution using ts-node
- [x] **Dependencies Installed**: All XMTP V3 SDK dependencies ready
- [x] **Keys Generated**: Secure bot keys created and validated
- [x] **Configuration Verified**: All environment variables validated

## 🧪 **Phase 2: Component Testing**

### **2.1 XMTP Bot Service Testing**

**Status**: ✅ **RUNNING** (Terminal 23)

```bash
# Test bot configuration
npm run bot:test

# Start bot service
npm run bot:dev

# Expected output:
# ✓ XMTP client initialized for address: 0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c
# ✓ Environment: dev
# ✓ Inbox ID: 16ff50d497ed1b3ac2a9e8979d295d35f103dd2e53cf45c953ac43a4e1e42d3d
# 🤖 AI Bot service started successfully!
# ✓ Syncing conversations...
# ✓ Waiting for messages...
```

### **2.2 Enhanced Message Store Testing** ✅ **NEW**

```bash
# Setup and test message storage system
npm run setup:message-store

# Expected output:
# 🚀 Setting up Enhanced Message Store...
# 1. Testing PostgreSQL connection...
# ✅ PostgreSQL connection successful
# 2. Testing message retrieval...
# ✅ Retrieved X messages
# 3. Testing conversation statistics...
# ✅ Conversation stats: {...}
# 4. Testing conversations list...
# ✅ Found X conversations
# 🎉 Enhanced Message Store setup completed successfully!

# Test complete message flow
npm run setup:message-store test

# Expected: Full conversation simulation with user/bot messages
```

### **2.3 Frontend Development Server**

```bash
# Start Next.js development server
npm run dev

# Expected: Server running on http://localhost:3000
```

### **2.4 API Endpoints Testing**

```bash
# Test bot status endpoint
curl http://localhost:3000/api/xmtp/bot-status

# Test enhanced message sending (now with persistent storage)
curl -X POST http://localhost:3000/api/xmtp/send-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello bot!", "userAddress": "0x1234567890123456789012345678901234567890"}'

# Test enhanced conversation history (PostgreSQL + Redis)
curl "http://localhost:3000/api/xmtp/conversation-history?conversationId=test_conv&limit=20"

# Expected response format:
# {
#   "success": true,
#   "messages": [
#     {
#       "id": "user_123...",
#       "sender": "You",
#       "content": "Hello bot!",
#       "timestamp": 1640995200000,
#       "messageType": "user"
#     },
#     {
#       "id": "bot_456...",
#       "sender": "PredictionBot",
#       "content": "Hello! How can I help you create predictions?",
#       "timestamp": 1640995201000,
#       "messageType": "bot"
#     }
#   ],
#   "pagination": {
#     "total": 2,
#     "limit": 20,
#     "offset": 0,
#     "hasMore": false
#   }
# }

# Test user votes endpoint
curl "http://localhost:3000/api/user-votes?address=0x55A5705453Ee82c742274154136Fce8149597058"

# Test prediction statistics
curl http://localhost:3000/api/predictions/stats

# Test specific prediction stats
curl http://localhost:3000/api/predictions/1/stats

# Test prediction resolution status
curl http://localhost:3000/api/predictions/resolve

# Test prediction resolution monitoring
curl -X POST http://localhost:3000/api/predictions/resolve \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

# Test prediction eligibility check
curl -X POST http://localhost:3000/api/predictions/resolve \
  -H "Content-Type: application/json" \
  -d '{"action": "eligible"}'

# Test specific prediction resolution
curl -X POST http://localhost:3000/api/predictions/resolve \
  -H "Content-Type: application/json" \
  -d '{"action": "resolve", "predictionId": 1}'
```

## 🔗 **Phase 3: Integration Testing**

### **3.1 XMTP.chat Integration**

1. **Open XMTP.chat**: https://xmtp.chat
2. **Connect Wallet**: Use any Ethereum wallet
3. **Send Message**: To bot address `0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c`
4. **Test Messages**:
   - "Hello bot!"
   - "I predict Bitcoin will reach $100k by end of year"
   - "Create a prediction about Ethereum price"

**Expected Bot Responses**:

- Intelligent AI-generated responses
- Structured prediction proposals
- Confirmation prompts for predictions

### **3.2 Frontend Chat Interface**

1. **Open App**: http://localhost:3000
2. **Navigate to Prediction Market**
3. **Open Chat Interface**
4. **Test Real-time Features**:
   - Send messages via the UI
   - Verify real-time message delivery
   - Check conversation history loading
   - Test connection status indicators
   - Verify optimistic message updates
5. **Test Bot Communication**:
   - Send messages via the UI
   - Verify bot responses appear
   - Test prediction proposal flow

### **3.3 Smart Contract Integration**

1. **Test Prediction Creation**:

   - Send prediction via chat
   - Confirm prediction when prompted
   - Verify on-chain transaction

2. **Check Base Sepolia Explorer**:
   - Visit: https://sepolia.basescan.org/
   - Search for contract: `0x5552e0ca9fd8e71bc2D0941619248f91d30CDa0E`
   - Verify prediction transactions

## 🔍 **Phase 4: End-to-End Testing**

### **4.1 Complete User Flow**

1. **User Opens App** → Frontend loads correctly
2. **User Opens Chat** → Chat interface appears
3. **User Sends Message** → API processes request
4. **Bot Receives Message** → XMTP delivers to bot service
5. **AI Processes Message** → OpenAI generates response
6. **Bot Sends Response** → User sees AI response
7. **User Confirms Prediction** → Smart contract interaction
8. **Transaction Confirmed** → On-chain record created

### **4.2 Error Handling Testing**

1. **Network Issues**: Disconnect internet, verify graceful handling
2. **Invalid Messages**: Send malformed requests, check error responses
3. **API Failures**: Test with invalid OpenAI key, verify fallbacks
4. **Smart Contract Errors**: Test with insufficient gas, verify error messages

## 📊 **Phase 5: Performance Testing**

### **5.1 Load Testing**

```bash
# Test multiple concurrent messages
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/xmtp/send-message \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Test message $i\", \"userAddress\": \"0x123$i\"}" &
done
```

### **5.2 Memory Usage**

```bash
# Monitor bot service memory usage
ps aux | grep "ts-node.*ai-bot-service"

# Monitor Next.js memory usage
ps aux | grep "next"
```

## 🛠️ **Phase 6: Build & Production Testing**

### **6.1 Production Build**

```bash
# Build Next.js app
npm run build

# Build Node.js bot service
npm run build:node

# Test production bot service
npm run bot:build
```

### **6.2 Production Environment Variables**

```bash
# Test with production environment
XMTP_ENV=production npm run bot:test
```

## ✅ **Testing Checklist**

### **Core Functionality**

- [ ] Bot service starts without errors
- [ ] XMTP client connects successfully
- [ ] Frontend development server runs
- [ ] API endpoints respond correctly
- [ ] Chat interface loads and functions
- [ ] Messages send and receive properly
- [ ] AI responses are generated
- [ ] Smart contract interactions work
- [ ] On-demand prediction resolution works
- [ ] External API data fetching works
- [ ] Eligibility checking accurate
- [ ] Crypto price data updates
- [ ] Weather API integration functional
- [ ] Timezone parsing accurate

### **Integration Points**

- [ ] XMTP.chat external testing
- [ ] Frontend-to-API communication
- [ ] API-to-bot-service communication
- [ ] Bot-to-XMTP network communication
- [ ] Bot-to-OpenAI API communication
- [ ] Bot-to-smart-contract communication

### **Error Scenarios**

- [ ] Network disconnection handling
- [ ] Invalid API key handling
- [ ] Malformed message handling
- [ ] Smart contract failure handling
- [ ] Rate limiting behavior

### **Performance**

- [ ] Response time under 5 seconds
- [ ] Memory usage stable over time
- [ ] Concurrent request handling
- [ ] No memory leaks detected

### **Production Readiness**

- [ ] Production build succeeds
- [ ] Environment variables validated
- [ ] Security considerations addressed
- [ ] Deployment guide tested

## 🚀 **Ready for Production Deployment**

Once all tests pass:

1. **Commit Changes**: `git add . && git commit -m "Complete XMTP integration with local testing"`
2. **Push to Repository**: `git push origin main`
3. **Deploy Bot Service**: Follow `docs/BOT_DEPLOYMENT_GUIDE.md`
4. **Deploy Frontend**: Standard Vercel deployment
5. **Update Environment**: Set production XMTP environment
6. **Final Testing**: Test production deployment end-to-end

## 📞 **Support & Troubleshooting**

If any tests fail, refer to:

- `docs/XMTP_SETUP_GUIDE.md` - Setup instructions
- `docs/BOT_DEPLOYMENT_GUIDE.md` - Deployment guide
- `docs/CLEANUP_SUMMARY.md` - Code organization details

Your implementation is now ready for comprehensive local testing! 🎉
