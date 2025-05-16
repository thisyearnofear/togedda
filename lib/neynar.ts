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
  // Use our server-side API route instead of directly accessing Neynar
  const response = await fetch(
    `/api/farcaster/user?fid=${fid}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    }
  );

  if (!response.ok) {
    console.error(
      "Failed to fetch Farcaster user",
      await response.json()
    );
    throw new Error("Failed to fetch Farcaster user");
  }

  const data = await response.json();
  return data.user;
};
