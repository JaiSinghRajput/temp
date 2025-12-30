import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import dbUtil from "@/app/utils/db.util";
import { sendOtp } from "@/app/utils/sendOtp";
import { generateJWT } from "@/lib/jwt";
import { User } from "@/lib/types";
import { PoolConnection } from "mysql2/promise";

interface RegisterRequest {
  phone?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  otp?: string;
  tempUserId?: number;
}

export async function POST(req: Request) {
  return dbUtil.withTransaction(
    async (conn: PoolConnection) => {
      const body: RegisterRequest = await req.json();
      const { phone, email, first_name, last_name, otp, tempUserId } = body;

      // Step 1: Validate details and send OTP
      if (phone && first_name && last_name && !otp) {
        // Validate phone format
        if (phone.trim().length < 10) {
          return NextResponse.json(
            { message: "Invalid phone number", success: false },
            { status: 400 }
          );
        }

        // Validate email if provided
        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return NextResponse.json(
              { message: "Invalid email format", success: false },
              { status: 400 }
            );
          }
        }

        // Check if phone already exists
        const [existingRows]: any = await conn.query(
          "SELECT id FROM users WHERE phone = ?",
          [phone]
        );

        if (existingRows.length > 0) {
          return NextResponse.json(
            { message: "Phone number already registered", success: false },
            { status: 409 }
          );
        }

        // Check if email already exists (if provided)
        if (email) {
          const [emailRows]: any = await conn.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
          );

          if (emailRows.length > 0) {
            return NextResponse.json(
              { message: "Email already registered", success: false },
              { status: 409 }
            );
          }
        }

        // Create temporary user record with status=0
        const [result]: any = await conn.query(
          "INSERT INTO users (phone, email, first_name, last_name, status) VALUES (?, ?, ?, ?, ?)",
          [phone, email || null, first_name, last_name, 0]
        );

        const tempUserId = result.insertId;

        // Generate and send OTP
        try {
          const generatedOtp = await sendOtp(phone);

          if (!generatedOtp) {
            // Delete the temporary user if OTP fails
            await conn.query("DELETE FROM users WHERE id = ?", [tempUserId]);
            return NextResponse.json(
              {
                message: "Failed to send OTP. Please try again.",
                success: false,
              },
              { status: 500 }
            );
          }

          // Update OTP in database with expiration (5 minutes)
          const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

          await conn.query(
            "UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?",
            [generatedOtp, otpExpiresAt, tempUserId]
          );

          return NextResponse.json(
            {
              message: "OTP sent successfully to your phone",
              tempUserId,
              success: true,
            },
            { status: 200 }
          );
        } catch (error: any) {
          console.error("OTP sending error:", error);
          // Delete the temporary user if OTP fails
          await conn.query("DELETE FROM users WHERE id = ?", [tempUserId]);
          return NextResponse.json(
            {
              message: "Failed to send OTP. Please check your phone number.",
              success: false,
            },
            { status: 500 }
          );
        }
      }

      // Step 2: Verify OTP and complete registration
      else if (otp && tempUserId) {
        // Validate OTP format
        if (!String(otp) || otp.toString().length !== 6) {
          return NextResponse.json(
            { message: "Invalid OTP format", success: false },
            { status: 400 }
          );
        }

        // Get temporary user by ID
        const [rows]: any = await conn.query(
          "SELECT * FROM users WHERE id = ?",
          [tempUserId]
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { message: "Registration session not found. Please start again.", success: false },
            { status: 404 }
          );
        }

        const user: User = rows[0];

        // Check if OTP matches
        if (user.otp !== String(otp)) {
          return NextResponse.json(
            { message: "Invalid OTP", success: false },
            { status: 401 }
          );
        }

        // Check if OTP has expired
        const now = new Date();
        if (!user.otp_expires_at) {
          return NextResponse.json(
            { message: "OTP not found or expired", success: false },
            { status: 401 }
          );
        }
        const otpExpiresAt = new Date(user.otp_expires_at);

        if (now > otpExpiresAt) {
          return NextResponse.json(
            { message: "OTP has expired. Please request a new one.", success: false },
            { status: 401 }
          );
        }

        // Mark user as verified and clear OTP
        await conn.query(
          "UPDATE users SET status = 1, otp = NULL, otp_expires_at = NULL WHERE id = ?",
          [tempUserId]
        );

        // Generate full name from first_name and last_name
        const fullName = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(' ') || "User";

        // Generate JWT token and log user in
        const tokenPayload = {
          id: user.id,
          name: fullName,
          email: user.email || null,
          mobile: user.phone,
          role: "",
        };

        const token = generateJWT(tokenPayload, "30d");

        const response = NextResponse.json(
          {
            success: true,
            message: "Registration successful! You are now logged in.",
            user: {
              id: user.id,
              name: fullName,
              email: user.email,
              phone: user.phone,
              first_name: user.first_name,
              last_name: user.last_name,
            },
          },
          { status: 201 }
        );

        // Set secure cookie with JWT token
        response.cookies.set("__auth_token__", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/",
        });

        return response;
      }

      return NextResponse.json(
        {
          message:
            "Invalid request. Provide phone, first_name, last_name (to send OTP) or otp+tempUserId (to verify)",
          success: false,
        },
        { status: 400 }
      );
    },
    (error: Error) => {
      console.error("User registration error:", error);
      return NextResponse.json(
        { message: "Internal server error", success: false },
        { status: 500 }
      );
    }
  );
}