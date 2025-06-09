# Imperfect Form: Farcaster Mini App Setup Guide

This guide will help you set up your Imperfect Form Farcaster mini app correctly, ensuring it's cohesive and follows best practices.

## Prerequisites

1. Node.js 16+ and npm/yarn
2. A Farcaster account
3. An Upstash account for Redis
4. A Neynar API key
5. A domain for hosting your mini app

## Step 1: Environment Setup

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/thisyearnofear/minikit-miniapp
cd minikit-miniapp
npm install
```

2. Set up your `.env.local` file with the following variables:
```
# Required for Frame metadata
NEXT_PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_MINIKIT_PROJECT_ID="imperfect-form"

# Required to allow users to add your frame
NEXT_PUBLIC_FARCASTER_HEADER="your-header"
NEXT_PUBLIC_FARCASTER_PAYLOAD="your-payload"
NEXT_PUBLIC_FARCASTER_SIGNATURE="your-signature"

# Required for user authentication
NEYNAR_API_KEY=your-neynar-api-key
JWT_SECRET=your-jwt-secret

# Required for webhooks and background notifications
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token
```

3. Generate Farcaster manifest variables:
   - Visit [Manifest Tool](https://warpcast.com/~/developers/mini-apps/manifest)
   - Enter your domain
   - Copy the generated values to your `.env.local` file

## Step 2: Redis Setup for Notifications

1. Create an account on [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the `REDIS_URL` and `REDIS_TOKEN` from the dashboard
4. Add these values to your `.env.local` file

## Step 3: Contract Deployment

1. Deploy the prediction market contract to CELO:
   - Follow the instructions in `contracts/README.md`
   - Make sure to enable the optimizer and IR-based code generator to avoid the "Stack too deep" error
   - Save the deployed contract address

2. Update the contract address in your code:
   - Open `lib/prediction-market.ts`
   - Replace `YOUR_DEPLOYED_CONTRACT_ADDRESS` with your actual contract address:
   ```typescript
   const PREDICTION_MARKET_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
   ```

## Step 4: Customize the Mini App

1. Update the app metadata in `app/page.tsx` and `app/layout.tsx`
2. Update the Farcaster manifest in `public/.well-known/farcaster.json`
3. Add your app assets to the `public` directory:
   - `logo.png` (1024x1024px)
   - `splash.png` (200x200px)
   - `hero.png` (1200x630px)
   - `og.png` (1200x630px)

## Step 5: Local Development

1. Start the development server:
```bash
npm run dev
```

2. Run a local tunneling service:
```bash
npx localtunnel --port 3000
```

3. Update your `.env.local` with the tunnel URL:
```
NEXT_PUBLIC_URL=https://your-tunnel-url.loca.lt
```

## Step 6: Testing the Mini App

1. Test user authentication with Farcaster
2. Test the prediction market functionality:
   - Creating predictions
   - Voting on predictions
   - Staking tokens
   - Claiming rewards

3. Test notifications and webhooks

## Step 7: Deployment

1. Deploy to Vercel or your preferred hosting platform
2. Update your environment variables on the hosting platform
3. Set up a custom domain
4. Update your Farcaster manifest with the production domain

## Best Practices for Farcaster Mini Apps

### UI/UX Guidelines

1. **Keep it compact**: Farcaster mini apps have limited screen space
2. **Mobile-first**: Design for mobile screens as most Farcaster users are on mobile
3. **Quick interactions**: Users expect fast interactions, minimize steps required
4. **Visual feedback**: Use animations and visual cues for blockchain transactions
5. **Error handling**: Provide clear error messages for failed transactions

### Performance Optimization

1. **Minimize bundle size**: Keep your JavaScript bundle small
2. **Lazy loading**: Use dynamic imports for components that aren't immediately needed
3. **Image optimization**: Use Next.js Image component for optimized images
4. **Caching**: Implement caching strategies for blockchain data

### Blockchain Integration

1. **Gas optimization**: Keep gas usage low for better user experience
2. **Transaction feedback**: Always provide clear feedback on transaction status
3. **Error recovery**: Implement robust error handling for failed transactions
4. **Wallet integration**: Use Farcaster's embedded wallet features

## Troubleshooting

### Contract Compilation Issues

If you encounter the "Stack too deep" error when compiling contracts:
- Make sure to enable the optimizer and IR-based code generator
- See the troubleshooting section in `contracts/README.md`

### Redis Connection Issues

If you have problems with Redis:
- Verify your Redis URL and token
- Check if your IP is whitelisted in Upstash
- Test the connection with a simple script

### Farcaster Authentication Issues

If users can't authenticate:
- Verify your Neynar API key
- Check your JWT secret
- Ensure your Farcaster manifest is correctly set up

## Resources

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [Farcaster Mini Apps](https://miniapps.xyz)
- [Neynar Documentation](https://docs.neynar.com/)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [CELO Developer Documentation](https://docs.celo.org/developer)
