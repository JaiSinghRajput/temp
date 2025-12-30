import { NextResponse } from "next/server";
import { pool } from "@/app/lib/db";
import dbUtil from "@/app/utils/db.util";
import { generateJWT } from "@/app/lib/jwt";
import { verifyPassword } from "@/app/lib/bcryptUtils";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: Request) {
  return dbUtil.normal(
    async () => {
      if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
      const body = await req.json();
      const { email, password, role } = body;
      if (!email || !password || !role) {
        return NextResponse.json(
          { message: "Email, password, and role are required", success: false },
          { status: 400 }
        );
      }
      const [rows]: any = await pool.query(
        "SELECT * FROM admins WHERE email = ?",
        [email]
      );
      const admin = rows[0];
      if (!admin) {
        return NextResponse.json(
          { message: "Invalid email or password", success: false },
          { status: 401 }
        );
      }
      const isPasswordValid = await verifyPassword(password, admin.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: "Invalid password" },
          { status: 401 }
        );
      }

      if (admin.role !== role) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid role",
          },
          { status: 403 }
        );
      }
      const token = generateJWT({
        id: admin.id,
        name: admin.name,
        mobile: null,
        email: admin.email,
        role: admin.role,
      });
      const response = NextResponse.json(
        {
          message: "Login successful",
          user: {
            id: admin.id,
            name: admin.name,
            mobile: null,
            email: admin.email,
            role: admin.role,
          },
          success: true,
        },
        {
          status: 201,
        }
      );

      response.cookies.set("__dwh_token__", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 60 * 60 * 24,
      });
      return response;
    },
    () => {
      return NextResponse.json(
        { message: "Internal server error", success: false },
        { status: 500 }
      );
    }
  );
}
