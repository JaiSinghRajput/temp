import { NextResponse } from "next/server";
import dbUtil from "@/app/utils/db.util";
import { sendOtp } from "@/app/utils/sendOtp";
import { generateJWT } from "@/lib/jwt";
import { GuestUserInterface } from "@/types/user.type";

export async function POST(req: Request) {
  return dbUtil.withTransaction(
    async (conn) => {
      const body = await req.json();
      const { phone, otp, id } = body;
      if (phone) {
        const [rows]: any = await conn.query(
          "SELECT * FROM guest_users WHERE phone = ?",
          [phone]
        );
        const guestuser: GuestUserInterface = rows[0];
        if (!guestuser) {
          return NextResponse.json({
            message: "not found",
            success: false
          }, { status: 401 });
        }
        const otp = await sendOtp(phone);
        await conn.query(
          `UPDATE guest_users SET otp = ?, otp_expires_at = ? WHERE id = ?`,
          [otp, new Date(Date.now() + 5 * 60 * 1000), guestuser.id]
        );
        return NextResponse.json(
          { message: "Otp Sent", id: guestuser.id, success: true },
          { status: 201 }
        );
      } else if (otp && id) {
        const [rows] = await conn.query(
          "SELECT * FROM guest_users WHERE id = ?",
          [id]
        );
        const guestuser: GuestUserInterface = rows[0];
        if (guestuser.otp !== String(body.otp)) {
          return NextResponse.json({ success: false, message: "Invalid OTP" });
        }
        const now = new Date();
        if (now > new Date(guestuser.otp_expires_at)) {
          return NextResponse.json({ success: false, message: "OTP expired" });
        }
        await conn.query("UPDATE guest_users SET status = 1 WHERE id = ?", [
          id,
        ]);
        const token = generateJWT(
          {
            id: guestuser.id,
            name: guestuser.name,
            mobile: null,
            email: null,
            role: "guest",
          },
          "30d"
        );
        const response = NextResponse.json(
          {
            success: true,
            message: "Login successful",
          },
          { status: 201 }
        );
        response.cookies.set("__dwh_token__", token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
          maxAge: 60 * 60 * 24,
        });
        return response;
      }
      return NextResponse.json(
        { message: "Invalid request", success: false },
        { status: 400 }
      );
    },
    () => {
      return NextResponse.json(
        { message: "Internal server error", success: false },
        { status: 500 }
      );
    }
  );
}
