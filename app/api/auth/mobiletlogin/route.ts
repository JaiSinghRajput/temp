import { NextResponse } from "next/server";
import dbUtil from "@/app/utils/db.util";
import { sendOtp } from "@/app/utils/sendOtp";
import { generateJWT } from "@/lib/jwt";
import { User, AuthPayload } from "@/lib/types";
import { PoolConnection } from "mysql2/promise";

interface MobileLoginRequest {
  phone?: string;
  otp?: string;
  id?: number;
}

export async function POST(req: Request) {
  return dbUtil.withTransaction(
    async (conn: PoolConnection) => {
      const body: MobileLoginRequest = await req.json();
      const { phone, otp, id } = body;

      // Step 1: Send OTP to phone number (for login verification only)
      if (phone) {
        // Validate phone number format
        if (!phone || phone.trim().length < 10) {
          return NextResponse.json(
            { message: "Invalid phone number", success: false },
            { status: 400 }
          );
        }

        // Check if user exists
        const [rows]: any = await conn.query(
          "SELECT * FROM users WHERE phone = ?",
          [phone]
        );

        if (rows.length === 0) {
          return NextResponse.json(
            {
              message: "Phone number not registered. Please register first.",
              success: false,
            },
            { status: 404 }
          );
        }

        const user: User = rows[0];

        // Generate and send OTP
        try {
          const generatedOtp = await sendOtp(phone);

          if (!generatedOtp) {
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
            [generatedOtp, otpExpiresAt, user.id]
          );

          return NextResponse.json(
            {
              message: "OTP sent successfully",
              id: user.id,
              success: true,
            },
            { status: 200 }
          );
        } catch (error: any) {
          console.error("OTP sending error:", error);
          return NextResponse.json(
            {
              message: "Failed to send OTP. Please check your phone number.",
              success: false,
            },
            { status: 500 }
          );
        }
      }

      // Step 2: Verify OTP
      else if (otp && id) {
        // Validate OTP and ID
        if (!String(otp) || otp.toString().length !== 6) {
          return NextResponse.json(
            { message: "Invalid OTP format", success: false },
            { status: 400 }
          );
        }

        // Get user by ID
        const [rows]: any = await conn.query(
          "SELECT * FROM users WHERE id = ?",
          [id]
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { message: "User not found", success: false },
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

        // Mark user as verified
        await conn.query(
          "UPDATE users SET status = 1, otp = NULL, otp_expires_at = NULL WHERE id = ?",
          [id]
        );

        // Generate full name from first_name and last_name
        const fullName = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(' ') || "User";

        // Generate JWT token
        const tokenPayload: AuthPayload = {
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
            message: "Login successful",
            user: {
              id: user.id,
              name: fullName,
              email: user.email,
              phone: user.phone,
              first_name: user.first_name,
              last_name: user.last_name,
              role: "",
            },
          },
          { status: 200 }
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
            "Invalid request. Provide either phone (to send OTP) or otp+id (to verify)",
          success: false,
        },
        { status: 400 }
      );
    },
    (error: Error) => {
      console.error("Mobile login error:", error);
      return NextResponse.json(
        { message: "Internal server error", success: false },
        { status: 500 }
      );
    }
  );
}

/**
 * POST /api/auth/mobiletlogin
 *
 * Mobile user login endpoint with OTP verification
 *
 * Note: User must be registered first via /api/auth/user/register
 *
 * Step 1: Send OTP
 * Request body:
 * {
 *   "phone": "+919876543210"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP sent successfully",
 *   "id": 1
 * }
 *
 * Step 2: Verify OTP
 * Request body:
 * {
 *   "otp": "123456",
 *   "id": 1
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "user": {
 *     "id": 1,
 *     "name": "John Doe",
 *     "email": "user@example.com",
 *     "phone": "+919876543210",
 *     "first_name": "John",
 *     "last_name": "Doe",
 *     "role": ""
 *   }
 * }
 */
