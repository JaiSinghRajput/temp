import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

// Explicitly allow preflight and HEAD to avoid 405s
export function OPTIONS() {
  return NextResponse.json({ success: true }, { status: 200 });
}

export function HEAD(req: NextRequest) {
  return GET(req);
}

// Some clients may still POST to verify; treat POST like GET to avoid 405s
export async function POST(req: NextRequest) {
  return GET(req);
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
          uid: user.uid,
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