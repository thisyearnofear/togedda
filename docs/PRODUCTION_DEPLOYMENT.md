# Imperfect Form: Production Deployment Guide

This guide will help you deploy your Imperfect Form Farcaster mini app to production.

## Prerequisites

1. Your contracts are deployed to CELO mainnet:
   - Factory Contract: `0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9`
   - Prediction Market Contract: `0x28461Aeb1af60D059D9aD07051df4fB70C5C1921`

2. You have a domain for your mini app (e.g., `imperfectform.fun`)

3. You have a Vercel account or another hosting provider

## Step 1: Prepare Your Environment Variables

Create a `.env.production` file with the following variables:

```
NEXT_PUBLIC_URL=https://your-production-domain.com
NEXT_PUBLIC_MINIKIT_PROJECT_ID="imperfect-form"
NEXT_PUBLIC_FARCASTER_HEADER="your-header"
NEXT_PUBLIC_FARCASTER_PAYLOAD="your-payload"
NEXT_PUBLIC_FARCASTER_SIGNATURE="your-signature"
NEYNAR_API_KEY=your-neynar-api-key
JWT_SECRET=your-jwt-secret
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x28461Aeb1af60D059D9aD07051df4fB70C5C1921
NEXT_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS=0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9
```

## Step 2: Update Your Farcaster Manifest

1. Update the `public/.well-known/farcaster.json` file with your production domain:

```json
{
  "frame": {
    "version": "1",
    "name": "Imperfect Form",
    "iconUrl": "https://your-production-domain.com/logo.png",
    "homeUrl": "https://your-production-domain.com",
    "splashImageUrl": "https://your-production-domain.com/splash.png",
    "splashBackgroundColor": "#000000",
    "subtitle": "Track fitness goals across chains",
    "description": "Imperfect Form helps you track push-ups and squats across multiple blockchain networks with a retro-gamified style.",
    "primaryCategory": "health-fitness",
    "tags": [
      "fitness",
      "blockchain",
      "gamification",
      "prediction-market"
    ]
  }
}
```

## Step 3: Prepare Your Assets

Ensure you have the following assets in your `public` directory:

1. `logo.png` (1024x1024px)
2. `splash.png` (200x200px)
3. `hero.png` (1200x630px)
4. `og.png` (1200x630px)

## Step 4: Build and Deploy

### Deploying to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure the environment variables in the Vercel dashboard
4. Deploy your app

### Manual Deployment

1. Build your app:

```bash
npm run build
```

2. Deploy the `out` directory to your hosting provider

## Step 5: Configure Your Domain

1. Set up your custom domain in your hosting provider
2. Configure DNS settings for your domain
3. Ensure HTTPS is enabled

## Step 6: Verify Your Deployment

1. Visit your production URL
2. Test the authentication flow
3. Test the prediction market functionality:
   - Creating predictions
   - Voting on predictions
   - Staking tokens
   - Claiming rewards

## Step 7: Register Your Mini App with Farcaster

1. Visit [Warpcast Developer Portal](https://warpcast.com/~/developers/mini-apps)
2. Register your mini app with your production domain
3. Generate new Farcaster manifest variables for your production domain
4. Update your environment variables with the new manifest variables

## Step 8: Monitor and Maintain

1. Set up monitoring for your app
2. Monitor contract interactions
3. Set up error tracking
4. Regularly check for updates to the Farcaster mini app framework

## Troubleshooting Production Issues

### Contract Interaction Issues

If users are having trouble interacting with the contracts:

1. Verify the contract addresses in your environment variables
2. Check that the contracts are properly deployed on CELO mainnet
3. Test the contract interactions with a small amount of tokens

### Authentication Issues

If users can't authenticate:

1. Verify your Neynar API key
2. Check your JWT secret
3. Ensure your Farcaster manifest is correctly set up

### Redis Connection Issues

If you have problems with Redis:

1. Verify your Redis URL and token
2. Check if your production server's IP is whitelisted in Upstash
3. Test the connection with a simple script

## Production Checklist

- [ ] Contracts deployed to CELO mainnet
- [ ] Environment variables configured
- [ ] Farcaster manifest updated
- [ ] Assets prepared
- [ ] App built and deployed
- [ ] Domain configured
- [ ] HTTPS enabled
- [ ] Mini app registered with Farcaster
- [ ] Monitoring set up
- [ ] Error tracking set up
- [ ] Contract interactions tested
- [ ] Authentication flow tested
- [ ] Notification system tested
