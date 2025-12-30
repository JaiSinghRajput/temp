import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import dbUtil from "@/app/utils/db.util";
import { hashPassword } from "@/lib/bcryptUtils";
import { Admin } from "@/lib/types";

export async function POST(req: Request) {
  return dbUtil.normal(
    async () => {
      const body = await req.json();
      const { name, email, password, role = "admin" } = body;

      // Validate input
      if (!name || !email || !password) {
        return NextResponse.json(
          { message: "Name, email, and password are required", success: false },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { message: "Invalid email format", success: false },
          { status: 400 }
        );
      }

      // Validate password length
      if (password.length < 6) {
        return NextResponse.json(
          { message: "Password must be at least 6 characters", success: false },
          { status: 400 }
        );
      }

      // Validate role
      if (!["admin", "super_admin"].includes(role)) {
        return NextResponse.json(
          { message: "Invalid role. Must be 'admin' or 'super_admin'", success: false },
          { status: 400 }
        );
      }

      // Check if email already exists
      const [existingRows]: any = await pool.query(
        "SELECT id FROM admins WHERE email = ?",
        [email]
      );

      if (existingRows.length > 0) {
        return NextResponse.json(
          { message: "Email already registered", success: false },
          { status: 409 }
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert new admin
      const [result]: any = await pool.query(
        "INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)",
        [name, email, hashedPassword, role]
      );

      const newAdmin: Admin = {
        id: result.insertId,
        name,
        email,
        password: hashedPassword,
        role: role as "admin" | "super_admin",
      };

      return NextResponse.json(
        {
          success: true,
          message: "Admin registered successfully",
          user: {
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role,
          },
        },
        { status: 201 }
      );
    },
    (error: Error) => {
      console.error("Admin registration error:", error);
      return NextResponse.json(
        { message: "Internal server error", success: false },
        { status: 500 }
      );
    }
  );
}

/**
 * POST /api/auth/admin/register
 *
 * Admin registration endpoint (no verification needed)
 * Note: This should be protected and only accessible to super admins or during initial setup
 *
 * Request body:
 * {
 *   "name": "Admin Name",
 *   "email": "admin@example.com",
 *   "password": "securePassword123",
 *   "role": "admin" // optional, defaults to "admin"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Admin registered successfully",
 *   "user": {
 *     "id": 1,
 *     "name": "Admin Name",
 *     "email": "admin@example.com",
 *     "role": "admin"
 *   }
 * }
 */
