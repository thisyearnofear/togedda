# Imperfect Form - Complete Deployment Guide

This guide covers deploying the entire Imperfect Form platform including smart contracts, AI bot service, and frontend application.

## 🚀 Quick Deploy Checklist

### Frontend (Vercel)

- ✅ **Live:** [imperfectminiapp.vercel.app](https://imperfectminiapp.vercel.app)
- ✅ **Auto-deploy:** Connected to GitHub main branch

### Smart Contracts

- ✅ **CELO Mainnet:** `0x4d6b336F174f17daAf63D233E1E05cB105562304` (Production)
- ✅ **Base Sepolia:** `0x9B4Be1030eDC90205C10aEE54920192A13c12Cba` (Hackathon)
- ✅ **PredictionBot:** `0x5552e0ca9fd8e71bc2D0941619248f91d30CDa0E` (AI Integration)

### AI Bot Service

- 🚧 **Status:** Ready for deployment (see sections below)

---

## 📱 Frontend Deployment (Vercel)

The frontend is automatically deployed via Vercel with GitHub integration:

1. **Repository:** [github.com/thisyearnofear/minikit-miniapp](https://github.com/thisyearnofear/minikit-miniapp)
2. **Live URL:** [imperfectminiapp.vercel.app](https://imperfectminiapp.vercel.app)
3. **Auto-deploy:** Pushes to `main` branch trigger automatic deployment

### Environment Variables (Vercel)

```env
# Core Configuration
NEXT_PUBLIC_NEYNAR_CLIENT_ID=your-neynar-client-id
NEXT_PUBLIC_NEYNAR_API_KEY=your-neynar-api-key
NEON_DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
OPENAI_API_KEY=your-openai-api-key
XMTP_ENV=production

# Real-time Features
NEXT_PUBLIC_PREDICTION_BOT_XMTP_ADDRESS=0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c
NEXT_PUBLIC_WS_URL=https://your-domain.vercel.app
NEXT_PUBLIC_ENABLE_REAL_TIME=true

# Performance Optimization
NEXT_PUBLIC_CACHE_TTL=300000
NEXT_PUBLIC_MAX_RETRIES=3
```

---

## 🔗 Smart Contract Deployment

### Base Sepolia (Hackathon)

**Contract:** `ImperfectFormPredictionMarketV2`
**Address:** `0x9B4Be1030eDC90205C10aEE54920192A13c12Cba`
**Explorer:** [Base Sepolia Scan](https://sepolia.basescan.org/address/0x9B4Be1030eDC90205C10aEE54920192A13c12Cba)

**Deployment Steps:**

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Connect MetaMask to Base Sepolia
3. Upload contract from `contracts/base/ImperfectFormPredictionMarketV2.sol`
4. Compile with Solidity 0.8.17+
5. Deploy with constructor parameters:
   - `_platformFeePercentage`: 2000 (20%)
   - `_charityAddress`: Your charity wallet address

### CELO Mainnet (Production)

**Contract:** `ImperfectFormPredictionMarketV2`
**Address:** `0x4d6b336F174f17daAf63D233E1E05cB105562304`
**Explorer:** [CELO Explorer](https://explorer.celo.org/mainnet/address/0x4d6b336F174f17daAf63D233E1E05cB105562304)

---

## 🤖 AI Bot Service Deployment

### Option 1: Railway (Recommended)

Railway is recommended for XMTP bot deployment as shown in the [official examples](https://github.com/ephemeraHQ/xmtp-agent-examples/discussions/77).

#### Steps:

1. **Create Railway Account**

   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**

   - Connect your repository
   - Select the `minikit-miniapp` repository
   - Railway will auto-detect it as a Node.js project

3. **Configure Environment Variables**
   Add these variables in Railway dashboard:

   ```
   # Core Bot Configuration
   BOT_PRIVATE_KEY=0x3bb004a416795527ad236f1f7e64535e6490f3b74ab776ab2da95eb96f6a22f0
   ENCRYPTION_KEY=0x2a2d2edbd5c24c8c2237563a95ef427e62968bf97ef9119b3c6165e6b44a06a5
   XMTP_ENV=dev
   OPENAI_API_KEY=sk-your-actual-openai-api-key
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   PREDICTION_BOT_XMTP_ADDRESS=0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c

   # Real-time Features
   ENABLE_MESSAGE_PERSISTENCE=true
   MESSAGE_RETENTION_DAYS=30
   MAX_MESSAGES_PER_CONVERSATION=1000
   CACHE_SIZE=5000
   ```

4. **Configure Start Command**
   In Railway settings, set the start command to:

   ```
   node dist/lib/ai-bot-service.js
   ```

5. **Build Configuration**
   Create a `railway.toml` file:

   ```toml
   [build]
   builder = "nixpacks"
   buildCommand = "npm run build && npx tsc lib/ai-bot-service.ts --outDir dist --target es2020 --module commonjs --moduleResolution node --esModuleInterop true --allowSyntheticDefaultImports true"

   [deploy]
   startCommand = "node dist/lib/ai-bot-service.js"
   ```

### Option 2: Heroku

1. **Install Heroku CLI**
2. **Create Heroku App**

   ```bash
   heroku create your-xmtp-bot
   ```

3. **Set Environment Variables**

   ```bash
   heroku config:set BOT_PRIVATE_KEY=0x...
   heroku config:set ENCRYPTION_KEY=0x...
   heroku config:set XMTP_ENV=dev
   heroku config:set OPENAI_API_KEY=sk-...
   ```

4. **Create Procfile**

   ```
   worker: node dist/lib/ai-bot-service.js
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 3: VPS/Docker

1. **Create Dockerfile**

   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   RUN npx tsc lib/ai-bot-service.ts --outDir dist --target es2020 --module commonjs
   CMD ["node", "dist/lib/ai-bot-service.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t xmtp-bot .
   docker run -d --env-file .env xmtp-bot
   ```

## Environment Configuration

### Development

```env
XMTP_ENV=dev
OPENAI_API_KEY=sk-your-dev-key
```

### Production

```env
XMTP_ENV=production
OPENAI_API_KEY=sk-your-production-key
```

## Security Considerations

1. **Private Key Security**

   - Never commit private keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly

2. **API Key Management**

   - Use separate OpenAI keys for dev/prod
   - Monitor API usage and set limits
   - Implement rate limiting

3. **Network Security**
   - Use HTTPS for all API endpoints
   - Implement proper CORS policies
   - Monitor for unusual activity

## Monitoring and Logging

1. **Add Logging**

   ```javascript
   console.log(`[${new Date().toISOString()}] Bot started`);
   console.log(`[${new Date().toISOString()}] Message received: ${message}`);
   ```

2. **Health Checks**
   Add a health check endpoint:

   ```javascript
   app.get("/health", (req, res) => {
     res.json({ status: "healthy", timestamp: new Date().toISOString() });
   });
   ```

3. **Error Tracking**
   Consider integrating Sentry or similar service

## Testing Deployment

1. **Check Bot Status**

   ```bash
   curl https://your-bot-url.railway.app/health
   ```

2. **Test XMTP Connection**

   - Go to [xmtp.chat](https://xmtp.chat)
   - Send message to bot address: `0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c`
   - Verify bot responds

3. **Test Prediction Flow**

   - Send: "I predict Bitcoin will reach $100k"
   - Verify AI response with prediction proposal
   - Test confirmation flow

4. **Test Real-time Features**
   - Open multiple browser tabs
   - Send messages and verify real-time delivery
   - Check conversation history persistence
   - Test connection status indicators
   - Verify cache performance with React Query DevTools

## Troubleshooting

### Common Issues

1. **"Module not found" errors**

   - Ensure all dependencies are installed
   - Check TypeScript compilation

2. **XMTP connection failures**

   - Verify private key format
   - Check encryption key length (64 hex chars)
   - Confirm XMTP environment setting

3. **OpenAI API errors**
   - Verify API key is valid
   - Check rate limits and billing
   - Monitor token usage

### Debug Mode

Enable debug logging:

```env
DEBUG=true
NODE_ENV=development
```

## Scaling Considerations

1. **Multiple Workers**

   - Use PM2 or similar for process management
   - Implement message queuing for high volume

2. **Database Persistence**

   - Consider adding Redis for conversation state
   - Implement message history storage

3. **Load Balancing**
   - Use multiple bot instances
   - Implement proper session management

## Next Steps

1. Deploy bot service to Railway/Heroku
2. Test with XMTP.chat interface
3. Monitor logs and performance
4. Implement additional features as needed

## Resources

- [Railway Deployment Guide](https://github.com/ephemeraHQ/xmtp-agent-examples/discussions/77)
- [XMTP Documentation](https://docs.xmtp.org/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
