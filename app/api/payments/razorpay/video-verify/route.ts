import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

const { RAZORPAY_KEY_SECRET } = process.env;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, request_id } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !request_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification fields' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured');
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update request with payment details
    await pool.query<ResultSetHeader>(
      `UPDATE e_video_requests 
       SET payment_status = 'paid', 
           payment_id = ?, 
           payment_order_id = ?,
           payment_signature = ?
       WHERE id = ?`,
      [razorpay_payment_id, razorpay_order_id, razorpay_signature, request_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('Error verifying video payment:', error);
    return NextResponse.json(
      { success: false, error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
