import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Logout by clearing the auth token cookie
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.set("__auth_token__", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 0, // This expires the cookie immediately
    path: "/",
  });

  return response;
}

export async function GET(req: NextRequest) {
  // Verify token and return user info
  try {
    const token = req.cookies.get("__auth_token__")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No token found" },
        { status: 401 }
      );
    }

    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/logout
 * Logout endpoint - clears the authentication token cookie
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */

/**
 * GET /api/auth/verify
 * Verify current authentication token and get user info
 *
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "id": 1,
 *     "name": "User Name",
 *     "email": "user@example.com",
 *     "mobile": "+919876543210",
 *     "role": "admin"
 *   }
 * }
 */
