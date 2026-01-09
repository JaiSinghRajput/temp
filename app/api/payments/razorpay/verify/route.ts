import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

function getClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured');
  }

  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const { order_id, payment_id, signature, user_custom_content_id } = body || {};

    if (!order_id || !payment_id || !signature || !user_custom_content_id) {
      return NextResponse.json(
        { success: false, error: 'order_id, payment_id, signature, and user_custom_content_id are required' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret is not configured');
    }

    const [orderRows] = await connection.query<RowDataPacket[]>(
      `SELECT o.id, o.status, o.total as amount, p.id as payment_id, p.status as payment_status
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.order_number = ? AND o.id = ?
       LIMIT 1`,
      [order_id, order_id]
    );

    if (!orderRows.length) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderRecord = orderRows[0] as any;

    if (orderRecord.status === 'paid' || orderRecord.payment_status === 'success') {
      return NextResponse.json({ success: true, data: { payment_status: 'paid' } });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    let verifiedAmount: number | null = orderRecord.amount ?? null;

    try {
      const client = getClient();
      const order = await client.orders.fetch(order_id);
      verifiedAmount = (order.amount ? Number(order.amount) : null) ?? verifiedAmount;
    } catch (fetchError) {
      console.warn('Razorpay order fetch failed, skipping amount verification', fetchError);
    }

    await connection.beginTransaction();

    try {
      // Update order status
      const [updateResult] = await connection.query<ResultSetHeader>(
        `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`,
        ['paid', orderRecord.id]
      );

      // Update or create payment record
      await connection.query(
        `UPDATE payments SET status = ?, provider_reference = ?, amount = ? WHERE order_id = ?`,
        ['success', payment_id, verifiedAmount, orderRecord.id]
      );

      // Update user custom content status
      await connection.query(
        `UPDATE user_custom_content SET status = ?, updated_at = NOW() WHERE id = ?`,
        ['paid', user_custom_content_id]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        data: {
          payment_status: 'paid',
          payment_id,
          order_id,
          amount: verifiedAmount,
        },
      });
    } catch (txError) {
      await connection.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
