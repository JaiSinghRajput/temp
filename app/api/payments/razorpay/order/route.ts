import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
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
    const { user_custom_content_id } = body || {};

    if (!user_custom_content_id) {
      return NextResponse.json(
        { success: false, error: 'user_custom_content_id is required' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ucc.id, ucc.content_id, ci.type, p.price, p.sale_price, o.id as order_id, o.status as order_status
       FROM user_custom_content ucc
       LEFT JOIN content_items ci ON ucc.content_id = ci.id
       LEFT JOIN products p ON p.content_id = ci.id
       LEFT JOIN orders o ON o.id = ucc.id
       WHERE ucc.id = ?
       LIMIT 1`,
      [user_custom_content_id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: 'Custom content not found' },
        { status: 404 }
      );
    }

    const record = rows[0] as any;

    // Check if already paid
    if (record.order_status === 'paid') {
      return NextResponse.json({ success: true, data: { payment_status: 'paid' } });
    }

    // Check if product requires payment
    const price = Number(record.sale_price || record.price || 0);
    
    if (price <= 0) {
      return NextResponse.json({ success: true, data: { payment_required: false, reason: 'No price configured' } });
    }

    const amount = Math.round(price * 100);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid price configured' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    try {
      const client = getClient();

      const order = await client.orders.create({
        amount,
        currency: 'INR',
        receipt: `content-${record.id}-${Date.now()}`,
        notes: {
          user_custom_content_id: String(record.id),
          content_id: String(record.content_id),
          content_type: record.type,
        },
      });

      // Create order in database
      const [orderResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO orders (order_number, user_id, status, subtotal, total, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [order.id, null, 'pending', price, price]
      );

      // Create payment record
      await connection.query(
        `INSERT INTO payments (order_id, provider, provider_reference, amount, status)
         VALUES (?, ?, ?, ?, ?)`,
        [orderResult.insertId, 'razorpay', order.id, amount, 'pending']
      );

      // Link user_custom_content to order (update id field if structure allows)
      // Alternative: create a mapping table or store order_id in user_custom_content
      
      await connection.commit();

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
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
