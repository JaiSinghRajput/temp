import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

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
    const { amount, template_id, request_id, currency = 'INR', receipt, notes } = body;

    if (!amount || !template_id) {
      return NextResponse.json(
        { success: false, error: 'amount and template_id are required' },
        { status: 400 }
      );
    }

    const finalAmount = Math.round(Number(amount));
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const client = getClient();

    const order = await client.orders.create({
      amount: finalAmount,
      currency,
      receipt: receipt || `video-${template_id}-${Date.now()}`,
      notes: {
        ...notes,
        template_id: String(template_id),
        request_id: request_id ? String(request_id) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay video order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
