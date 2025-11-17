# 🏆 BNB Chain Prediction Markets Hackathon - Togedda Roadmap

## 🎯 **Hackathon Goal: Revolutionary Fitness Prediction Market on BNB Chain**

**Deadline**: November 18, 2025  
**Prize Pool**: $400K + Seedify Launch Opportunities  
**Focus**: Demonstrate niche prediction market with fast oracle resolution and "normal app" UX

---

## 🌟 **Product Vision for Hackathon**

**Tagline**: *"Lose gracefully, win through effort"*

Transform prediction market failures into motivation through **effort-based stake recovery**. When users fail their fitness predictions, they don't just lose—they can recover 80% of their stake by completing additional exercise challenges, verified through cross-chain oracle system.

### **Key Differentiators**
1. **Niche Market**: Fitness predictions (not financial/politics)
2. **Oracle Innovation**: <2hr resolution vs UMA's 24-48hr delay
3. **Novel Mechanic**: Stake recovery through verified effort
4. **Normal App Feel**: Goals and progress bars, not AMM interfaces
5. **Clear Revenue**: Protocol fees + recovery fees from day one

---

## 📅 **3-Week Development Sprint**

### **Week 1: BNB Foundation + Core Oracle (Nov 4-10)**

#### **Smart Contracts**
- [ ] Deploy `UnifiedPredictionMarket` to BNB Chain mainnet
- [ ] Build `ExerciseOracle` contract with attestation verification
- [ ] Build `VerifierRegistry` for attestor bonding and slashing
- [ ] Add protocol fee (2%) and recovery fee (0.5-1%) mechanisms
- [ ] Integrate oracle verification into prediction resolution flow

#### **Backend Infrastructure**
- [ ] Off-chain attestor service setup
- [ ] Event indexing from Base/CELO/Polygon contracts
- [ ] EIP-712 signature generation for attestations
- [ ] Confirmation threshold logic per chain (Base: 3, CELO: 5, Polygon: 10)
- [ ] Attestation submission queue with retry logic

#### **Technical Deliverables**
```typescript
// Oracle Contract Functions
- registerVerifier(address, bond) // Attestor registration
- submitAttestation(attestation, signature) // Submit exercise proof
- challengeAttestation(attestationId, evidence) // Dispute mechanism
- finalizeAttestation(attestationId) // After challenge window
- slashVerifier(address) // Penalize false attestations

// Attestation Structure
{
  user: address,
  exerciseType: string,
  amount: uint256,
  requiredAmount: uint256,
  timeWindow: uint256,
  sourceChainId: uint256,
  sourceTxHashes: bytes32[],
  issuedAt: uint256,
  expiresAt: uint256,
  nonce: uint256
}
```

---

### **Week 2: UI/UX Revolution + Cross-Chain Integration (Nov 11-17)**

#### **🎨 UI/UX Complete Overhaul**

##### **Landing Page Redesign**
- [ ] **Hero Section**: "Turn Your Fitness Goals Into Wins"
  - Clear value prop: "Stake on goals. Fail? Recover by sweating."
  - Live stats: Total staked, predictions made, recovery success rate
  - Prominent CTA: "Start Your First Prediction" (connects wallet)
  
- [ ] **How It Works** (3-step visual flow)
  1. 💪 "Create Prediction" → Shows example: "1000 pushups by tomorrow"
  2. 🏃 "Do The Work" → Integration with sister apps shown visually
  3. 🎁 "Win or Recover" → 100% if you win, 80% recovery if you complete extra

- [ ] **Live Activity Feed**
  - Real-time predictions being created
  - Recent recoveries with confetti animations
  - Community progress on collective goals

##### **Prediction Creation Flow (Game-Like UX)**
- [ ] **Template Library** (Pre-built Popular Predictions)
  ```
  🏃 "Run 5km this week" - Suggested stake: 0.05 BNB
  💪 "1000 pushups in 24 hours" - Suggested stake: 0.1 BNB
  🧘 "7-day yoga streak" - Suggested stake: 0.2 BNB
  ```
  
- [ ] **Visual Builder** (No DeFi Jargon)
  - Progress slider for goals (not "target value")
  - Calendar picker for deadline
  - BNB amount with dollar equivalent in real-time
  - Fee breakdown tooltip (not hidden in contract)
  
- [ ] **AI-Assisted Creation** via XMTP
  - Chat bubble: "Chat with AI to create custom prediction"
  - Natural language: "I want to do 500 squats by Friday"
  - AI suggests stake amount based on difficulty

##### **Dashboard - Personal Command Center**
- [ ] **Active Predictions Card**
  ```
  ┌─────────────────────────────────────┐
  │ 🏃 1000 Pushups Challenge          │
  │ ▓▓▓▓▓▓▓▓░░ 75% Complete (750/1000) │
  │ ⏰ 8 hours remaining                │
  │ 💰 0.1 BNB at stake                │
  │ [Track Exercise] [Give Up]         │
  └─────────────────────────────────────┘
  ```
  
- [ ] **Recovery Opportunities** (Prominent when failed)
  ```
  ┌─────────────────────────────────────┐
  │ ⚠️  You missed your goal!           │
  │ BUT... you can recover 80%!         │
  │                                     │
  │ Original: 1000 pushups ❌           │
  │ You did: 750 pushups                │
  │                                     │
  │ 🔥 Recovery Challenge:              │
  │ Do 250 MORE pushups in 24hrs        │
  │ = Get back 0.08 BNB                │
  │                                     │
  │ [Accept Challenge] [Details]       │
  └─────────────────────────────────────┘
  ```
  
- [ ] **Achievement Gallery**
  - NFT badges displayed with rarity
  - Streaks highlighted with fire animations
  - Social sharing buttons (Twitter/Farcaster frames)

##### **Verification Flow (Trust Building)**
- [ ] **Real-Time Verification Display**
  ```
  ┌─────────────────────────────────────┐
  │ 🔍 Verifying Your Exercise...      │
  │                                     │
  │ ✅ Found 250 pushups on Base        │
  │    Tx: 0xabc...def                  │
  │    🔵 Base • 3 confirmations        │
  │                                     │
  │ ⏳ Waiting for challenge window...  │
  │    ▓▓▓▓░░░░░░ 45 min remaining     │
  │                                     │
  │ 💰 0.08 BNB ready to claim          │
  │ [View Proof] [Claim Now]           │
  └─────────────────────────────────────┘
  ```
  
- [ ] **Proof Panel** (Transparency)
  - Source chain icons with tx links
  - Attestor address with reputation score
  - Timestamp and challenge window countdown
  - "Challenge this proof" button (disabled for self)

##### **Mobile-First Responsive Design**
- [ ] Bottom navigation for mobile (Home, Predict, Progress, Profile)
- [ ] Swipeable prediction cards
- [ ] One-tap connect wallet (WalletConnect presets for Binance, Trust Wallet)
- [ ] Progressive Web App (PWA) manifest
- [ ] Push notifications for deadline reminders

#### **Design System Improvements**
- [ ] **Color Palette** (BNB-aligned)
  - Primary: BNB Gold (#F0B90B)
  - Success: Recovery Green (#10B981)
  - Warning: Deadline Orange (#F59E0B)
  - Accent: Exercise Purple (#8B5CF6)
  
- [ ] **Typography**
  - Headers: Bold, energetic (Inter/Outfit)
  - Body: Clean, readable (System fonts)
  - Numbers: Tabular figures for stakes/progress
  
- [ ] **Components**
  - Loading states with skeleton screens
  - Error states with recovery suggestions
  - Empty states with engaging illustrations
  - Micro-interactions (hover effects, confetti on wins)

#### **🔗 Cross-Chain Integration UI**
- [ ] **Chain Selector** (BNB Primary)
  - Visual: BNB as default with prominent placement
  - Multi-chain badge showing data sources
  - Chain health indicators (RPC status, gas prices)
  
- [ ] **Exercise Platform Badges**
  ```
  Data verified from:
  🔵 imperfectform.fun (Base)
  🟣 imperfectcoach (CELO)
  🟠 imperfectabs (Polygon)
  ```

---

### **Week 3: Polish, Demo Prep & Testing (Nov 18)**

#### **🎬 Demo Preparation**
- [ ] **Demo Script** with live flow
  1. Show landing page → explain value prop
  2. Create prediction using template
  3. Switch to imperfectform.fun → do exercise
  4. Return → show verification happening
  5. Trigger recovery flow → complete extra exercise
  6. Show attestation process → challenge window
  7. Claim 80% recovery + NFT
  
- [ ] **Demo Video** (5 min, English)
  - Screen recording with voiceover
  - Show cross-chain verification with tx links
  - Emphasize speed (<2hr vs 24-48hr)
  - Revenue model explanation
  - Future roadmap tease

#### **🧪 Testing & QA**
- [ ] **Smart Contract Audits**
  - OpenZeppelin standard compliance
  - Slither security analysis
  - Test coverage >80%
  
- [ ] **End-to-End Testing**
  - Create prediction on BNB testnet
  - Complete exercise on sister platforms
  - Verify attestation submission
  - Test challenge mechanism
  - Confirm recovery payout
  
- [ ] **UX Testing**
  - Mobile responsiveness on iOS/Android
  - Wallet connection flow (multiple wallets)
  - Error handling and recovery
  - Performance (page load <2s)

#### **📝 Documentation**
- [ ] **README.md** update with BNB focus
- [ ] **Deployment guide** for judges
- [ ] **Architecture diagram** (cross-chain oracle)
- [ ] **Revenue model** one-pager
- [ ] **API documentation** for attestor service

---

## 🎨 **UI/UX Key Screens Wireframes**

### **Screen 1: Landing Page**
```
┌─────────────────────────────────────────────────┐
│ 🟡 Togedda                    [Connect Wallet]  │
├─────────────────────────────────────────────────┤
│                                                 │
│           💪 Turn Fitness Goals Into Wins       │
│                                                 │
│     Stake on your goals. Fail? Recover 80%     │
│              by doing extra exercise.           │
│                                                 │
│         [Start Your First Prediction]           │
│                                                 │
│   📊 $12.5K Staked  🎯 1,247 Predictions Made  │
│   🔥 892 Recoveries  ⚡ <2hr Verification       │
│                                                 │
├─────────────────────────────────────────────────┤
│              How It Works                       │
│                                                 │
│   1️⃣ Create         2️⃣ Exercise       3️⃣ Win   │
│   Prediction        & Track          Or Recover │
│   [visual]          [visual]         [visual]   │
│                                                 │
├─────────────────────────────────────────────────┤
│          🔴 Live Activity Feed                  │
│                                                 │
│  🏃 Alice created "5km run" - 0.05 BNB          │
│  💪 Bob recovered 0.08 BNB with extra pushups!  │
│  🎯 Community: 15,000/20,000 squats done        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Screen 2: Prediction Creation**
```
┌─────────────────────────────────────────────────┐
│ ← Back                Create New Prediction      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Popular Templates                              │
│  ┌──────────────┐ ┌──────────────┐             │
│  │ 🏃 5km Run   │ │ 💪 1000 Push │             │
│  │ 0.05 BNB rec.│ │ 0.1 BNB rec. │             │
│  └──────────────┘ └──────────────┘             │
│                                                 │
│  Or Build Custom:                               │
│                                                 │
│  Exercise Type:                                 │
│  [Pushups ▼]                                    │
│                                                 │
│  Your Goal:                                     │
│  [1000] pushups                                 │
│                                                 │
│  Deadline:                                      │
│  [📅 Tomorrow 11:59 PM]                         │
│                                                 │
│  Stake Amount:                                  │
│  [0.1] BNB ($28.50 USD)                         │
│  💡 Recommended: 0.08-0.12 BNB                  │
│                                                 │
│  Fees (ℹ️):                                      │
│  • Protocol: 0.002 BNB (2%)                     │
│  • Recovery: 0.001 BNB (1% if you recover)      │
│  • You get: 0.098 BNB if you win                │
│  • Recovery: 0.08 BNB with extra work           │
│                                                 │
│  [Create Prediction]                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Screen 3: Recovery Flow**
```
┌─────────────────────────────────────────────────┐
│          💪 Recovery Challenge                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your Original Prediction:                      │
│  1000 pushups by Nov 15, 11:59 PM ❌            │
│                                                 │
│  What You Completed:                            │
│  ▓▓▓▓▓▓▓▓░░ 750 pushups (75%)                   │
│                                                 │
│  Verified from:                                 │
│  🔵 Base: 450 pushups (Tx: 0xabc...def)         │
│  🟣 CELO: 200 pushups (Tx: 0x123...456)         │
│  🟠 Polygon: 100 pushups (Tx: 0x789...abc)      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔥 RECOVERY OPPORTUNITY                        │
│                                                 │
│  Complete 250 MORE pushups                      │
│  within 24 hours                                │
│                                                 │
│  💰 Recover: 0.08 BNB (80% of stake)            │
│  🎁 Earn: SweatEquity NFT                       │
│                                                 │
│  ⏰ Challenge expires: 23:45:12                 │
│                                                 │
│  [Accept Challenge]                             │
│  [No Thanks, I'll Pass]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Screen 4: Verification Status**
```
┌─────────────────────────────────────────────────┐
│          🔍 Verifying Your Exercise             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Status: Waiting for finalization...            │
│                                                 │
│  ✅ Step 1: Exercise Detected                   │
│     250 pushups found across chains             │
│     Completed: 2 minutes ago                    │
│                                                 │
│  ✅ Step 2: Attestation Submitted               │
│     Oracle signed & submitted to BNB            │
│     Attestor: 0x742...d4E (🏆 100% reliability) │
│     Tx: 0xdef...789 [View on BscScan]           │
│                                                 │
│  ⏳ Step 3: Challenge Window                    │
│     ▓▓▓▓▓▓░░░░░░░░                              │
│     45 minutes remaining                        │
│     Anyone can dispute with proof               │
│                                                 │
│  ⏸️ Step 4: Claim Rewards                       │
│     Available after challenge window            │
│     0.08 BNB + SweatEquity NFT                  │
│                                                 │
│  Proof Details:                                 │
│  ┌─────────────────────────────────┐            │
│  │ Source Chains:                  │            │
│  │ 🔵 Base: 150 reps (3 confirms)  │            │
│  │ 🟣 CELO: 100 reps (5 confirms)  │            │
│  │ Data: Valid ✓                   │            │
│  │ Nonce: 42 • Expires: 1hr        │            │
│  └─────────────────────────────────┘            │
│                                                 │
│  [View Full Proof] [Notify Me When Ready]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 **Technical Architecture**

### **Smart Contract Layer (BNB Chain)**
```solidity
// Core Contracts on BNB
├── UnifiedPredictionMarket.sol (Main market logic)
├── ExerciseOracle.sol (Attestation verification)
└── VerifierRegistry.sol (Attestor management)

// Cross-Chain Data Sources
├── Base: Exercise tracking contracts
├── CELO: Fitness data contracts
└── Polygon: Activity verification
```

### **Backend Services**
```typescript
// Off-Chain Attestor Service
├── event-indexer/ (Monitor Base/CELO/Polygon)
├── attestation-generator/ (EIP-712 signatures)
├── submission-queue/ (Submit to BNB Oracle)
└── dispute-monitor/ (Watch for challenges)

// API Layer
├── /api/predictions (CRUD for predictions)
├── /api/verify (Trigger verification)
├── /api/attestations (Get attestation status)
└── /api/proof (Get cross-chain proof data)
```

### **Frontend Architecture**
```typescript
// Next.js App Structure
├── app/
│   ├── page.tsx (Landing page - new design)
│   ├── predictions/
│   │   ├── create/ (New builder UI)
│   │   ├── [id]/ (Prediction detail + recovery)
│   │   └── active/ (Dashboard)
│   ├── recovery/ (Recovery flow)
│   └── profile/ (User achievements)
├── components/
│   ├── PredictionCard/ (Redesigned)
│   ├── RecoveryWidget/ (New)
│   ├── VerificationStatus/ (New)
│   ├── ProofPanel/ (New)
│   └── ChainBadge/ (Cross-chain indicators)
└── lib/
    ├── oracle-client.ts (Oracle interactions)
    ├── attestation-verifier.ts (Client-side proof check)
    └── chain-aggregator.ts (Multi-chain data)
```

---

## 💰 **Revenue Model Display**

### **Transparent Fee Structure (Shown in UI)**
```
┌─────────────────────────────────────┐
│ 💰 How Togedda Makes Money          │
├─────────────────────────────────────┤
│                                     │
│ Protocol Fee: 2%                    │
│ • Taken from total pool             │
│ • Funds development & operations    │
│                                     │
│ Recovery Fee: 0.5%                  │
│ • Only charged on recovery claims   │
│ • Supports oracle infrastructure    │
│                                     │
│ Example (0.1 BNB stake):            │
│ • You win: Get 0.098 BNB            │
│ • You recover: Get 0.08 BNB         │
│ • Protocol gets: 0.002 + 0.0005 BNB │
│                                     │
│ [Learn More About Fees]             │
└─────────────────────────────────────┘
```

---

## 📊 **Success Metrics for Hackathon**

### **Demo Day Targets**
- ✅ Live BNB Chain deployment with verified contracts
- ✅ 10+ test predictions created and resolved
- ✅ 5+ successful recovery flows demonstrated
- ✅ <2 minute average verification time
- ✅ Cross-chain proof from 3+ networks shown
- ✅ Mobile-responsive UI functioning perfectly
- ✅ Clear revenue display with actual fees collected

### **Technical Benchmarks**
- Contract deployment: BscScan verified ✓
- Gas costs: <$0.50 per prediction creation
- Oracle latency: <2 hours (vs UMA 24-48hr)
- Frontend performance: Lighthouse score >90
- Uptime: 99.9% during judging period

### **UX Benchmarks**
- Time to create first prediction: <2 minutes
- Wallet connection success rate: >95%
- Mobile usability score: >4.5/5
- "Normal app feel" rating from users: >4/5

---

## 🎯 **Hackathon Submission Checklist**

### **Dorahacks Submission Requirements**
- [x] Register via [Typeform](https://seedify.typeform.com/to/rmMvi2nr)
- [x] Join [Telegram Group](https://t.me/+VBM124hTkUZmMjU1)
- [ ] Public code repo (GitHub with clear README)
- [ ] Working prototype on BNB Chain
- [ ] Demo video (5 min, English) uploaded
- [ ] Project description (150 words)
- [ ] Team info (150 words)

### **Technical Checklist**
- [ ] Contracts deployed and verified on BscScan
- [ ] Oracle system fully functional
- [ ] Cross-chain verification working
- [ ] Frontend deployed and accessible
- [ ] Basic tests with >80% coverage
- [ ] Documentation complete

### **UX Checklist**
- [ ] Landing page redesigned
- [ ] Prediction creation flow polished
- [ ] Recovery flow implemented
- [ ] Verification status UI complete
- [ ] Mobile-responsive design
- [ ] Error states handled gracefully

---

## 🚀 **Post-Hackathon Roadmap**

### **If We Win Top 5**
1. **Seedify Raise** ($15K soft cap → potential for more)
2. **BNB Chain Fast-Track** to Global BNB Hack
3. **YZi Labs Partnership** opportunities

### **Immediate Enhancements (Q1 2025)**
- Multi-attestor quorum system
- ZK proofs for privacy-preserving verification
- LayerZero/Axelar for trustless cross-chain messaging
- Mobile native apps (iOS/Android)
- Memory API integration for unified identity

### **Ecosystem Expansion (Q2 2025)**
- White-label platform for other fitness apps
- Third-party attestor marketplace
- Governance token for protocol decisions
- Multi-domain expansion (learning, creativity, etc.)

---

## 🎬 **Demo Script for Judges**

### **30-Second Pitch**
"Togedda turns prediction market failures into wins. When you fail your fitness goal, you don't just lose—you can recover 80% of your stake by completing extra exercise. We verify this through a fast cross-chain oracle that reads from multiple fitness platforms and resolves in under 2 hours, compared to UMA's 24-48 hour delay. It's a prediction market that feels like a fitness app, not a DeFi protocol."

### **Live Demo Flow (5 minutes)**
1. **Landing Page** (30s)
   - Show live stats, explain value prop
   - Click "Start Your First Prediction"

2. **Create Prediction** (1 min)
   - Select template: "1000 pushups by tomorrow"
   - Set stake: 0.1 BNB
   - Show fee breakdown transparently
   - Create prediction (wallet signature)

3. **Exercise Tracking** (1 min)
   - Open imperfectform.fun in new tab
   - Complete 750 pushups (simulated for demo)
   - Show on-chain storage across Base/CELO

4. **Prediction Failure** (30s)
   - Return to Togedda
   - Deadline passes, prediction marked as failed
   - Recovery opportunity appears

5. **Recovery Flow** (1.5 min)
   - Accept recovery challenge: "250 more pushups"
   - Complete exercise on sister platform
   - Show real-time verification:
     - Events detected on source chains
     - Attestor signs proof
     - Submission to BNB Oracle
     - Challenge window starts (2hr)
     - Proof panel with tx links

6. **Claim Recovery** (30s)
   - Finalize after challenge window
   - Claim 0.08 BNB + SweatEquity NFT
   - Confetti animation
   - Share to social media

### **Key Talking Points**
- **Niche**: First fitness-focused prediction market
- **Oracle**: Solves UMA latency problem with optimistic attestation
- **UX**: Feels like a goal-tracking app, not DeFi
- **Revenue**: Clear protocol fees, sustainable model
- **Cross-Chain**: Reads from 3+ networks, writes to BNB
- **Future**: Expandable to any domain (learning, creative, etc.)

---

## 📞 **Team & Contact**

### **Development Team**
- Smart Contract Development
- Frontend/UX Design
- Backend/Oracle Services
- Marketing/Community

### **Support During Hackathon**
- **Telegram**: Active in hackathon group
- **GitHub**: Public repo with issues enabled
- **Email**: For judge inquiries
- **Demo Site**: [Live BNB deployment URL]

---

## 🏅 **Why Togedda Will Win**

1. **Directly Addresses Hackathon Themes**
   - ✅ Niche prediction market (fitness)
   - ✅ Oracle innovation (fast optimistic attestation)
   - ✅ "Normal app" UX (no DeFi jargon)
   - ✅ Revenue-focused (clear fees from day one)

2. **Technical Innovation**
   - Cross-chain oracle with <2hr resolution
   - EIP-712 attestation with challenge mechanism
   - Multi-chain data aggregation
   - Optimistic verification with bonds

3. **Product Differentiation**
   - Only prediction market with "effort-based recovery"
   - Gamifies failure into motivation
   - Real-world utility beyond speculation
   - Built-in distribution via sister platforms

4. **Execution Quality**
   - Production-ready deployment
   - Polished UI/UX
   - Comprehensive documentation
   - Clear revenue model

5. **Future Potential**
   - Expandable to any achievement domain
   - White-label platform opportunity
   - Large addressable market (fitness + beyond)
   - Seedify raise readiness

---

*This roadmap is designed to win the BNB Chain Prediction Markets Hackathon by combining technical excellence, product innovation, and exceptional user experience. Every decision focuses on demonstrating a production-ready, revenue-generating prediction market that solves real problems with novel mechanics.*
