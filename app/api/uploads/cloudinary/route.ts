import { NextResponse } from 'next/server';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

export async function POST(req: Request) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return NextResponse.json(
      { success: false, error: 'Cloudinary env vars missing' },
      { status: 500 }
    );
  }

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  try {
    const incoming = await req.formData();
    const file = incoming.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const typedFile = file as File;
    if (!ALLOWED_TYPES.includes(typedFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, WEBP, GIF are allowed' },
        { status: 400 }
      );
    }

    if (typedFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File too large. Max 5MB allowed.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const uploadBody = new FormData();
    uploadBody.append('file', `data:${file.type};base64,${base64}`);
    uploadBody.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: uploadBody,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ success: false, error: errText }, { status: 500 });
    }

    const data = await uploadRes.json();
    const secureUrl: string = data.secure_url;
    const thumbUrl = secureUrl?.replace('/upload/', '/upload/c_scale,w_300/') ?? secureUrl;

    return NextResponse.json({
      success: true,
      secureUrl,
      publicId: data.public_id,
      thumbnailUrl: thumbUrl,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
