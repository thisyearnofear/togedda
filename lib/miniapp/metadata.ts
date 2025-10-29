import { env } from "@/lib/env";

export interface MiniAppEmbedOptions {
  title?: string;
  imageUrl?: string;
  url?: string;
  name?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
}

export interface MiniAppEmbed {
  version: "1";
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: "launch_frame";
      name?: string;
      url?: string;
      splashImageUrl?: string;
      splashBackgroundColor?: string;
    };
  };
}

/**
 * Generate a standardized Mini App embed object
 */
export function createMiniAppEmbed(options: MiniAppEmbedOptions = {}): MiniAppEmbed {
  const appUrl = env.NEXT_PUBLIC_URL;

  return {
    version: "1",
    imageUrl: options.imageUrl || `${appUrl}/og.png`,
    button: {
      title: options.title || "Stay Hard",
      action: {
        type: "launch_frame",
        name: options.name || "Imperfect Form",
        url: options.url || appUrl,
        splashImageUrl: options.splashImageUrl || `${appUrl}/splash.png`,
        splashBackgroundColor: options.splashBackgroundColor || "#000000",
      },
    },
  };
}

/**
 * Generate Mini App embed as JSON string for meta tags
 */
export function createMiniAppEmbedString(options: MiniAppEmbedOptions = {}): string {
  return JSON.stringify(createMiniAppEmbed(options));
}

/**
 * Generate Next.js metadata for Mini App embed
 */
export function createMiniAppMetadata(options: MiniAppEmbedOptions = {}): Record<string, string> {
  const embedString = createMiniAppEmbedString(options);

  return {
    "fc:miniapp": embedString,
    // Keep backward compatibility with frames
    "fc:frame": embedString,
  };
}

/**
 * Common Mini App embed configurations for different pages
 */
export const MINIAPP_EMBEDS = {
  home: () => createMiniAppEmbed({
    title: "Stay Hard",
    name: "Imperfect Form",
  }),

  leaderboard: () => createMiniAppEmbed({
    title: "View Leaderboard",
    name: "Imperfect Form - Leaderboard",
    url: `${env.NEXT_PUBLIC_URL}/leaderboard`,
  }),

  admin: () => createMiniAppEmbed({
    title: "Admin Panel",
    name: "Imperfect Form - Admin",
    url: `${env.NEXT_PUBLIC_URL}/admin`,
  }),

  profile: (username?: string) => createMiniAppEmbed({
    title: username ? `${username}'s Profile` : "View Profile",
    name: "Imperfect Form - Profile",
    url: username ? `${env.NEXT_PUBLIC_URL}/profile/${username}` : `${env.NEXT_PUBLIC_URL}/profile`,
  }),

  dynamic: (id: string, title?: string) => createMiniAppEmbed({
    title: title || "View Content",
    name: "Imperfect Form",
    url: `${env.NEXT_PUBLIC_URL}/dynamic-image-example/${id}`,
    imageUrl: `${env.NEXT_PUBLIC_URL}/api/og/example/${id}`,
  }),
} as const;

/**
 * Validate Mini App embed structure
 */
export function validateMiniAppEmbed(embed: any): embed is MiniAppEmbed {
  return (
    embed &&
    typeof embed === "object" &&
    embed.version === "1" &&
    typeof embed.imageUrl === "string" &&
    embed.button &&
    typeof embed.button === "object" &&
    typeof embed.button.title === "string" &&
    embed.button.action &&
    typeof embed.button.action === "object" &&
    embed.button.action.type === "launch_frame"
  );
}

/**
 * Extract embed from string and validate
 */
export function parseMiniAppEmbed(embedString: string): MiniAppEmbed | null {
  try {
    const embed = JSON.parse(embedString);
    return validateMiniAppEmbed(embed) ? embed : null;
  } catch {
    return null;
  }
}
