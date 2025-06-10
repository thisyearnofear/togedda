import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { env } from "./lib/env";

export const config = {
  matcher: ["/api/((?!auth|manifest|og|webhook|farcaster|ens|web3bio|ensdata|resolve|db-test|wallet-test).*)"],
};

export default async function middleware(req: NextRequest) {
  // Log the request path for debugging
  console.log(`Middleware processing: ${req.nextUrl.pathname}`);

  // Log all cookies for debugging
  const allCookies = req.cookies.getAll();
  console.log("Cookies in request:", allCookies.map(c => c.name));

  // Skip auth check for these endpoints
  if (
    req.nextUrl.pathname === "/api/auth/sign-in" ||
    req.nextUrl.pathname === "/api/auth/neynar-signin" ||
    req.nextUrl.pathname === "/api/auth/logout" ||
    req.nextUrl.pathname.includes("/api/og") ||
    req.nextUrl.pathname.includes("/api/webhook") ||
    req.nextUrl.pathname.includes("/api/farcaster") ||
    req.nextUrl.pathname.includes("/api/manifest") ||
    req.nextUrl.pathname.includes("/api/ens") ||
    req.nextUrl.pathname.includes("/api/web3bio") ||
    req.nextUrl.pathname.includes("/api/ensdata") ||
    req.nextUrl.pathname.includes("/api/resolve") ||
    req.nextUrl.pathname.includes("/api/db-test") ||
    req.nextUrl.pathname.includes("/api/wallet-test")
  ) {
    console.log(`Skipping auth check for: ${req.nextUrl.pathname}`);
    return NextResponse.next();
  }

  // Get token from auth_token cookie
  const token = req.cookies.get("auth_token")?.value;
  
  // Log all cookie details for debugging
  const allCookieDetails = req.cookies.getAll().map(cookie => ({
    name: cookie.name,
    value: cookie.name === "auth_token" ? 
      (cookie.value ? `${cookie.value.substring(0, 10)}...` : "undefined") : 
      "hidden"
    // RequestCookie type doesn't have these properties in Next.js middleware
    // We can only access name and value
  }));
  console.log(`Cookie details for ${req.nextUrl.pathname}:`, allCookieDetails);

  if (!token) {
    console.log(`No auth_token cookie found for: ${req.nextUrl.pathname}`);
    console.log(`Request origin: ${req.headers.get("origin")}`);
    console.log(`Request referer: ${req.headers.get("referer")}`);

    // For development, be more permissive with certain endpoints
    if (process.env.NODE_ENV === "development" &&
        (req.nextUrl.pathname.includes("/api/streaks") ||
         req.nextUrl.pathname.includes("/api/notify") ||
         req.nextUrl.pathname.includes("/api/test") ||
         req.nextUrl.pathname.includes("/api/sync-fitness"))) {
      console.log("Development mode: allowing access without auth");

      // Set a default FID for development testing
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-fid", "5254"); // Test user FID

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // For production, check if this is a test endpoint and allow it
    if (req.nextUrl.pathname === "/api/test") {
      console.log("Allowing /api/test endpoint without auth for debugging");
      return NextResponse.next();
    }

    // Production authentication required for fitness APIs

    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    console.log(`Verifying token for: ${req.nextUrl.pathname}`);
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    // Verify the token using jose
    const { payload } = await jose.jwtVerify(token, secret);

    console.log(`Token verified for FID: ${payload.fid}`);

    // Clone the request headers to add user info
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-fid", payload.fid as string);

    // Return response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error(`Token verification failed for: ${req.nextUrl.pathname}`, error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
