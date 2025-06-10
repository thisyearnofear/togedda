import { env } from "@/lib/env";
import { fetchUser } from "@/lib/neynar";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { fid, signature, message } = body;

    if (!fid || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch user data
    const user = await fetchUser(fid);

    if (!user || !user.custody_address) {
      return NextResponse.json(
        { error: "User not found or invalid custody address" },
        { status: 404 }
      );
    }

    // Verify signature matches custody address
    const isValidSignature = await verifyMessage({
      address: user.custody_address as `0x${string}`,
      message,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Check if JWT_SECRET is available
    if (!env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Generate JWT token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new jose.SignJWT({
      fid,
      walletAddress: user.custody_address,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Get the domain from the request
    const requestUrl = new URL(req.url);
    const domain = requestUrl.hostname;

    console.log("Setting auth cookie for domain:", domain);

    // Create the response
    const response = NextResponse.json({ success: true, user });

    // Set the auth cookie with the JWT token
    // Note: In Farcaster mini app environment, cookies need special handling
    const isProduction = process.env.NODE_ENV === "production";
    const isSecure = isProduction || requestUrl.protocol === "https:";

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: isProduction ? "none" : "lax", // Use "none" for production cross-site, "lax" for development
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
      // Don't set domain explicitly, let the browser handle it
    });

    // Log the cookie being set for debugging
    console.log("Auth cookie set:", {
      name: "auth_token",
      tokenLength: token.length,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return response;
  } catch (error) {
    console.error("Error in sign-in route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
