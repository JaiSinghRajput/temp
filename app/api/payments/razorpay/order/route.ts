import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

function getClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const { order_id } = body || {};

    if (!order_id) {
      return NextResponse.json({ success: false, error: "order_id is required" }, { status: 400 });
    }

    await connection.beginTransaction();

    // ✅ lock order row to avoid duplicate payments
    const [oRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, order_number, status, total
      FROM orders
      WHERE id = ?
      FOR UPDATE
      `,
      [Number(order_id)]
    );

    if (!oRows.length) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const order = oRows[0] as any;

    // ✅ If already paid, return paid
    if (order.status === "paid") {
      await connection.commit();
      return NextResponse.json({ success: true, data: { payment_status: "paid" } });
    }

    const totalRupees = Number(order.total || 0);
    const amountPaise = Math.round(totalRupees * 100);

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Invalid order total" }, { status: 400 });
    }

    // ✅ If payment already success but order not updated (edge case)
    const [paidRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id
      FROM payments
      WHERE order_id = ? AND provider='razorpay' AND status='success'
      ORDER BY id DESC
      LIMIT 1
      `,
      [Number(order_id)]
    );

    if (paidRows.length) {
      // optional: fix order status now
      await connection.query(`UPDATE orders SET status='paid' WHERE id=?`, [Number(order_id)]);
      await connection.commit();
      return NextResponse.json({ success: true, data: { payment_status: "paid" } });
    }

    // ✅ reuse existing pending payment if exists
    const [pRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, provider_reference, status
      FROM payments
      WHERE order_id = ? AND provider='razorpay'
      ORDER BY id DESC
      LIMIT 1
      `,
      [Number(order_id)]
    );

    if (pRows.length) {
      const p = pRows[0] as any;
      if (p.status === "pending" && p.provider_reference) {
        await connection.commit();
        return NextResponse.json({
          success: true,
          data: {
            order_id: p.provider_reference, // Razorpay order id
            amount: amountPaise,
            currency: "INR",
            key: RAZORPAY_KEY_ID,
            payment_status: "pending",
            reused: true,
          },
        });
      }
    }

    const client = getClient();

    // ✅ create razorpay order
    const razorOrder = await client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `db_order_${order.id}_${Date.now()}`,
      notes: {
        db_order_id: String(order.id),
        db_order_number: String(order.order_number),
      },
    });

    // ✅ create payment row (amount stored in RUPEES)
    await connection.query<ResultSetHeader>(
      `
      INSERT INTO payments (order_id, provider, provider_reference, amount, currency, status, created_at)
      VALUES (?, 'razorpay', ?, ?, 'INR', 'pending', NOW())
      `,
      [Number(order_id), razorOrder.id, totalRupees]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      data: {
        order_id: razorOrder.id,
        amount: amountPaise,
        currency: "INR",
        key: RAZORPAY_KEY_ID,
        payment_status: "pending",
        reused: false,
      },
    });
  } catch (err: any) {
    console.error("RAZORPAY_ORDER_ERROR:", err);
    try {
      await connection.rollback();
    } catch {}
    return NextResponse.json({ success: false, error: "Failed to create razorpay order" }, { status: 500 });
  } finally {
    connection.release();
  }
}
