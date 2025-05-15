import { env } from "@/lib/env";

/**
 * Get the farcaster manifest for the frame, generate yours from Warpcast Mobile
 *  On your phone to Settings > Developer > Domains > insert website hostname > Generate domain manifest
 * @returns The farcaster manifest for the frame
 */
export async function getFarcasterManifest() {
  let frameName = "Imperfect Form";
  let noindex = false;
  const appUrl = env.NEXT_PUBLIC_URL;
  if (appUrl.includes("localhost")) {
    frameName += " Local";
    noindex = true;
  } else if (appUrl.includes("ngrok")) {
    frameName += " NGROK";
    noindex = true;
  } else if (appUrl.includes("https://dev.")) {
    frameName += " Dev";
    noindex = true;
  }
  return {
    accountAssociation: {
      header: env.NEXT_PUBLIC_FARCASTER_HEADER,
      payload: env.NEXT_PUBLIC_FARCASTER_PAYLOAD,
      signature: env.NEXT_PUBLIC_FARCASTER_SIGNATURE,
    },
    frame: {
      version: "1",
      name: frameName,
      iconUrl: `${appUrl}/logo.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/og.png`,
      buttonTitle: `Launch App`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#000000",
      webhookUrl: `${appUrl}/api/webhook`,
      // Metadata https://github.com/farcasterxyz/miniapps/discussions/191
      subtitle: "Track fitness goals across chains", // 30 characters, no emojis or special characters, short description under app name
      description: "Imperfect Form helps you track push-ups and squats across multiple blockchain networks with a retro-gamified style.", // 170 characters, no emojis or special characters, promotional message displayed on Mini App Page
      primaryCategory: "health-fitness",
      tags: ["fitness", "blockchain", "gamification", "prediction-market"], // up to 5 tags, filtering/search tags
      tagline: "Fitness goals on-chain", // 30 characters, marketing tagline should be punchy and descriptive
      ogTitle: `${frameName}`, // 30 characters, app name + short tag, Title case, no emojis
      ogDescription: "Track fitness goals across blockchain networks with a retro-gamified style", // 100 characters, summarize core benefits in 1-2 lines
      screenshotUrls: [
        // 1284 x 2778, visual previews of the app, max 3 screenshots
        `${appUrl}/hero.png`,
      ],
      heroImageUrl: `${appUrl}/hero.png`, // 1200 x 630px (1.91:1), promotional display image on top of the mini app store
      ogImageUrl: `${appUrl}/og.png`, // 1200 x 630px (1.91:1), promotional image, same as app hero image
      noindex: noindex,
    },
  };
}
