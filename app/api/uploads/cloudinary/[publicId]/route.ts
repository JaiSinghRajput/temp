import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Cloudinary credentials missing' },
      { status: 500 }
    );
  }

  try {
    const { publicId } = await params;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Generate signature for authenticated request
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const deleteBody = new URLSearchParams({
      public_id: publicId,
      timestamp,
      api_key: CLOUDINARY_API_KEY,
      signature,
    });

    const deleteRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: deleteBody.toString(),
      }
    );

    const result = await deleteRes.json();

    if (result.result === 'ok' || result.result === 'not found') {
      return NextResponse.json({ success: true, result: result.result });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete image', details: result },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
