import { env } from "@/lib/env";

export interface NeynarUser {
  fid: string;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
}

export const fetchUser = async (fid: string): Promise<NeynarUser> => {
  try {
    // Direct call to Neynar API to avoid circular dependencies
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(env.NEYNAR_API_KEY ? { 'x-api-key': env.NEYNAR_API_KEY } : {}),
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Failed to fetch Farcaster user from Neynar",
        await response.text()
      );
      throw new Error("Failed to fetch Farcaster user");
    }

    const data = await response.json();

    if (data.users && data.users.length > 0) {
      return data.users[0];
    }

    throw new Error("User not found");
  } catch (error) {
    console.error("Error in fetchUser:", error);
    throw error;
  }
};
