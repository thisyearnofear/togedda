import { env } from "@/lib/env";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

interface NeynarUser {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  custody_address?: string;
  verifications?: string[];
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { user, message } = body;

    if (!user || !user.fid) {
      return NextResponse.json(
        { error: "Missing user data" },
        { status: 400 }
      );
    }

    // Validate that this is a proper Neynar user object
    const neynarUser: NeynarUser = {
      fid: user.fid,
      username: user.username,
      display_name: user.display_name,
      pfp_url: user.pfp_url,
      custody_address: user.custody_address,
      verifications: user.verifications || [],
    };

    if (!neynarUser.fid || !neynarUser.username) {
      return NextResponse.json(
        { error: "Invalid user data" },
        { status: 400 }
      );
    }

    // Check if JWT_SECRET is available
    if (!env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Generate JWT token for Neynar user
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new jose.SignJWT({
      fid: neynarUser.fid.toString(),
      walletAddress: neynarUser.custody_address || "",
      authSource: "neynar",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Get the domain from the request
    const requestUrl = new URL(req.url);
    const domain = requestUrl.hostname;

    console.log("Setting Neynar auth cookie for domain:", domain, "FID:", neynarUser.fid);

    // Create the response
    const response = NextResponse.json({ 
      success: true, 
      user: neynarUser,
      message: "Neynar authentication successful"
    });

    // Set the auth cookie with the JWT token
    const isProduction = process.env.NODE_ENV === "production";
    const isSecure = isProduction || requestUrl.protocol === "https:";

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Log the cookie being set for debugging
    console.log("Neynar auth cookie set:", {
      name: "auth_token",
      fid: neynarUser.fid,
      tokenLength: token.length,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return response;
  } catch (error) {
    console.error("Error in Neynar sign-in route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
