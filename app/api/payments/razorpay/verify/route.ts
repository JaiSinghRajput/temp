import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

function getClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured');
  }

  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, payment_id, signature, user_ecard_id } = body || {};

    if (!order_id || !payment_id || !signature || !user_ecard_id) {
      return NextResponse.json(
        { success: false, error: 'order_id, payment_id, signature, and user_ecard_id are required' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret is not configured');
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, payment_status, payment_order_id, payment_amount FROM user_ecards WHERE id = ? LIMIT 1',
      [user_ecard_id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    const record = rows[0] as any;

    if (record.payment_status === 'paid') {
      return NextResponse.json({ success: true, data: { payment_status: 'paid' } });
    }

    if (record.payment_order_id && record.payment_order_id !== order_id) {
      return NextResponse.json(
        { success: false, error: 'Order mismatch for this card' },
        { status: 400 }
      );
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

    let verifiedAmount: number | null = record.payment_amount ?? null;

    try {
      const client = getClient();
      const order = await client.orders.fetch(order_id);
      verifiedAmount = (order.amount ? Number(order.amount) : null) ?? verifiedAmount;
    } catch (fetchError) {
      console.warn('Razorpay order fetch failed, skipping amount verification', fetchError);
    }

    await pool.query(
      'UPDATE user_ecards SET payment_status = ?, payment_id = ?, payment_signature = ?, payment_order_id = COALESCE(payment_order_id, ?), payment_amount = COALESCE(payment_amount, ?), updated_at = NOW() WHERE id = ?',
      ['paid', payment_id, signature, order_id, verifiedAmount, record.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        payment_status: 'paid',
        payment_id,
        order_id,
        amount: verifiedAmount,
      },
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
