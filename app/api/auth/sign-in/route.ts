import { env } from "@/lib/env";
import { fetchUser } from "@/lib/neynar";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

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

    // Create the response
    const response = NextResponse.json({ success: true, user });

    // Set the auth cookie with the JWT token
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
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
