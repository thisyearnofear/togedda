# Farcaster Mini App Setup Guide

This guide will help you set up the Imperfect Form Farcaster mini app with Redis for notifications and webhooks.

## Prerequisites

1. A Farcaster account
2. An Upstash account for Redis
3. A Neynar API key
4. A domain for hosting your mini app

## Step 1: Set Up Redis with Upstash

1. Go to [Upstash](https://upstash.com/) and create an account
2. Create a new Redis database
3. Get the `REDIS_URL` and `REDIS_TOKEN` from the database dashboard
4. Add these values to your `.env.local` file

## Step 2: Get a Neynar API Key

1. Go to [Neynar](https://neynar.com/) and create an account
2. Create a new API key
3. Add the API key to your `.env.local` file as `NEYNAR_API_KEY`

## Step 3: Generate a JWT Secret

1. Generate a random string for your JWT secret
2. Add it to your `.env.local` file as `JWT_SECRET`

## Step 4: Create Required Assets

Create the following assets and place them in the `public` directory:

1. `logo.png` - 1024x1024px PNG with no alpha channel
2. `splash.png` - 200x200px PNG for the loading screen
3. `hero.png` - 1200x630px PNG (1.91:1 aspect ratio)
4. `og.png` - 1200x630px PNG for Open Graph previews
5. Screenshots (optional) - Up to 3 portrait screenshots (1284x2778px)

## Step 5: Update the Farcaster Manifest

1. Update the `public/.well-known/farcaster.json` file with your app details
2. Replace placeholder URLs with your actual domain

## Step 6: Generate Farcaster Manifest Variables

1. Deploy your app to a domain
2. Go to the [Farcaster Manifest Tool](https://warpcast.com/~/developers/mini-apps/manifest)
3. Enter your domain
4. Generate the account association
5. Copy the generated values to your `.env.local` file:
   - `NEXT_PUBLIC_FARCASTER_HEADER`
   - `NEXT_PUBLIC_FARCASTER_PAYLOAD`
   - `NEXT_PUBLIC_FARCASTER_SIGNATURE`
6. Update your `farcaster.json` file with the account association

## Step 7: Deploy Your App

1. Deploy your app to a hosting provider like Vercel
2. Set up the environment variables in your hosting provider
3. Verify that your app is accessible at your domain

## Step 8: Test Notifications

1. Add your mini app to your Farcaster account
2. Enable notifications
3. Test sending a notification from the app

## Troubleshooting

- If notifications aren't working, check your Redis connection
- If the app isn't loading, verify your Farcaster manifest is correct
- If you're getting authentication errors, check your Neynar API key

## Resources

- [Farcaster Mini Apps Documentation](https://miniapps.xyz)
- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [Upstash Documentation](https://docs.upstash.com/)
- [Neynar Documentation](https://docs.neynar.com/)
