import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

const { RAZORPAY_KEY_SECRET } = process.env;

export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ success: false, error: "Server misconfigured" }, { status: 500 });
    }

    // ✅ Signature verify
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    await connection.beginTransaction();

    // ✅ Find payment row
    const [pRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, order_id, status
      FROM payments
      WHERE provider='razorpay'
        AND provider_reference = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [razorpay_order_id]
    );

    if (!pRows.length) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
    }

    const pay = pRows[0] as any;

    // idempotent
    if (pay.status === "success") {
      await connection.commit();
      return NextResponse.json({ success: true });
    }

    // ✅ Update payment success
    await connection.query(
      `
      UPDATE payments
      SET status='success'
      WHERE id = ?
      `,
      [pay.id]
    );

    // ✅ Update order paid
    await connection.query(
      `
      UPDATE orders
      SET status='paid'
      WHERE id = ?
      `,
      [pay.order_id]
    );

    // ✅ If this order belongs to a customization -> update it paid
    await connection.query(
      `
      UPDATE user_custom_content ucc
      SET ucc.status='paid'
      WHERE ucc.order_id = ?
      `,
      [pay.order_id]
    );

    await connection.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("RAZORPAY_VERIFY_ERROR:", err);
    try {
      await connection.rollback();
    } catch {}
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  } finally {
    connection.release();
  }
}
