import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({ 
      success: true, 
      message: "Logged out successfully" 
    });

    // Clear the auth cookie
    response.cookies.set({
      name: "auth_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    console.log("[logout] Auth cookie cleared");
    return response;
  } catch (error) {
    console.error("Error in logout route:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
