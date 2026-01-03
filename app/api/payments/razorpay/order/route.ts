import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
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
    const { user_ecard_id } = body || {};

    if (!user_ecard_id) {
      return NextResponse.json(
        { success: false, error: 'user_ecard_id is required' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ue.id, ue.template_id, ue.payment_status, ue.payment_order_id, ue.payment_amount, t.pricing_type, t.price
       FROM user_ecards ue
       JOIN templates t ON t.id = ue.template_id
       WHERE ue.id = ?
       LIMIT 1`,
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

    if (record.pricing_type !== 'premium') {
      return NextResponse.json({ success: true, data: { payment_required: false, reason: 'Template is free' } });
    }

    const price = Number(record.price || 0);
    const amount = Math.round(price * 100);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid price configured for template' },
        { status: 400 }
      );
    }

    const client = getClient();

    const order = await client.orders.create({
      amount,
      currency: 'INR',
      receipt: `ecard-${record.id}-${Date.now()}`,
      notes: {
        user_ecard_id: String(record.id),
        template_id: String(record.template_id),
      },
    });

    await pool.query(
      'UPDATE user_ecards SET payment_order_id = ?, payment_amount = ?, payment_status = ? WHERE id = ?',
      [order.id, amount, 'pending', record.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: RAZORPAY_KEY_ID,
        payment_status: 'pending',
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
