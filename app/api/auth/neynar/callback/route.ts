import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

interface NeynarTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
  signer_uuid?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    console.log("Exchanging code for token:", { code, client_id: env.NEXT_PUBLIC_NEYNAR_CLIENT_ID });

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://api.neynar.com/v2/farcaster/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        client_id: env.NEXT_PUBLIC_NEYNAR_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${env.NEXT_PUBLIC_URL}/auth/neynar/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData
      });
      return NextResponse.json(
        { error: "Failed to exchange authorization code", details: errorData },
        { status: 400 }
      );
    }

    const tokenData: NeynarTokenResponse = await tokenResponse.json();
    console.log("Token exchange successful:", { access_token: tokenData.access_token ? "present" : "missing" });

    // Get user information using the access token
    const userResponse = await fetch("https://api.neynar.com/v2/farcaster/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "x-api-key": env.NEYNAR_API_KEY,
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error("User fetch failed:", {
        status: userResponse.status,
        statusText: userResponse.statusText,
        error: errorData
      });
      return NextResponse.json(
        { error: "Failed to fetch user information", details: errorData },
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    console.log("User data fetched successfully:", { fid: userData.fid, username: userData.username });
    const user: NeynarUser = {
      fid: userData.fid,
      username: userData.username,
      display_name: userData.display_name,
      pfp_url: userData.pfp_url,
      custody_address: userData.custody_address,
      verifications: userData.verifications || [],
      signer_uuid: userData.signer_uuid,
    };

    // Store user session (you can implement your own session management here)
    // For now, we'll just return the user data
    
    return NextResponse.json({
      success: true,
      user,
      access_token: tokenData.access_token, // You might want to store this securely
    });

  } catch (error) {
    console.error("Neynar callback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
