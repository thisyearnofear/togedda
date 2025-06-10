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
    console.log("[neynar-signin] Endpoint called");
    
    // Log request headers for debugging
    const requestHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });
    console.log("[neynar-signin] Request headers:", requestHeaders);
    
    // Log request cookies for debugging
    const requestCookies = req.cookies.getAll();
    console.log("[neynar-signin] Request cookies:", requestCookies.map(c => c.name));
    
    const body = await req.json();
    const { user, message } = body;

    console.log("[neynar-signin] Received data:", { 
      user: user ? { 
        fid: user.fid, 
        username: user.username,
        display_name: user.display_name,
        custody_address: user.custody_address ? `${user.custody_address.substring(0, 6)}...` : null
      } : null, 
      message 
    });

    if (!user || !user.fid) {
      console.log("[neynar-signin] Missing user data");
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
    
    // Force sameSite to lax for development to ensure cookie is sent with requests
    const sameSite = isProduction ? "none" : "lax";
    
    console.log("[neynar-signin] Setting cookie with options:", {
      isProduction,
      isSecure,
      sameSite,
      domain: domain,
      protocol: requestUrl.protocol,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSite,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
      // Don't set domain in development to use default behavior
      ...(isProduction && { domain: domain }),
    });

    // Log the cookie being set for debugging
    console.log("[neynar-signin] Auth cookie set:", {
      name: "auth_token",
      fid: neynarUser.fid,
      tokenLength: token.length,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    // Log all response cookies for debugging
    const responseCookies: Record<string, any> = {};
    response.cookies.getAll().forEach(cookie => {
      responseCookies[cookie.name] = {
        value: cookie.value.substring(0, 10) + "...",
        options: {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          maxAge: cookie.maxAge,
          path: cookie.path,
          domain: cookie.domain,
        }
      };
    });
    console.log("[neynar-signin] Response cookies:", responseCookies);

    return response;
  } catch (error) {
    console.error("Error in Neynar sign-in route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
