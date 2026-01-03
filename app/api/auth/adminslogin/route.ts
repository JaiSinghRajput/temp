import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import dbUtil from "@/app/utils/db.util";
import { generateJWT } from "@/lib/jwt";
import { verifyPassword, hashPassword } from "@/lib/bcryptUtils";
import { Admin, AuthPayload } from "@/lib/types";
import { COOKIE_OPTIONS } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: Request) {
  return dbUtil.normal(
    async () => {
      if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
      
      const body = await req.json();
      const { email, password, role } = body;
      
      // Validate input
      if (!email || !password) {
        return NextResponse.json(
          { message: "Email and password are required", success: false },
          { status: 400 }
        );
      }

      if (role && !["admin", "editor"].includes(role)) {
        return NextResponse.json(
          { message: "Invalid role", success: false },
          { status: 400 }
        );
      }

      // Get admin from database
      const [rows]: any = await pool.query(
        "SELECT * FROM admins WHERE email = ?",
        [email]
      );
      
      const admin: Admin = rows[0];
      
      if (!admin) {
        return NextResponse.json(
          { message: "Invalid email or password", success: false },
          { status: 401 }
        );
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, admin.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Check role if specified
      if (role && admin.role !== role) {
        return NextResponse.json(
          {
            success: false,
            message: "Insufficient permissions",
          },
          { status: 403 }
        );
      }

      // Generate JWT token
      const tokenPayload: AuthPayload = {
        uid: String(admin.id),
        name: admin.name,
        email: admin.email,
        mobile: null,
        role: admin.role,
      };

      const token = generateJWT(tokenPayload, "7d");
      
      const response = NextResponse.json(
        {
          message: "Login successful",
          user: {
            uid: String(admin.id),
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
          success: true,
        },
        { status: 200 }
      );

      // Set secure cookie with JWT token
      response.cookies.set(
        COOKIE_OPTIONS.AUTH_TOKEN.name,
        token,
        {
          httpOnly: COOKIE_OPTIONS.AUTH_TOKEN.httpOnly,
          secure: COOKIE_OPTIONS.AUTH_TOKEN.secure,
          sameSite: COOKIE_OPTIONS.AUTH_TOKEN.sameSite,
          maxAge: COOKIE_OPTIONS.AUTH_TOKEN.maxAge,
          path: COOKIE_OPTIONS.AUTH_TOKEN.path,
        }
      );

      return response;
    },
    (error: Error) => {
      console.error("Admin login error:", error);
      return NextResponse.json(
        { message: "Internal server error", success: false },
        { status: 500 }
      );
    }
  );
}
