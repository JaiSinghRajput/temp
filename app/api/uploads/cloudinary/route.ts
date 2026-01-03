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

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];

  try {
    const incoming = await req.formData();
    const file = incoming.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const typedFile = file as File;
    const isImage = IMAGE_TYPES.includes(typedFile.type);
    const isVideo = VIDEO_TYPES.includes(typedFile.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Allowed: images (jpg, png, webp, gif) or video (mp4, mov, mkv, webm).' },
        { status: 400 }
      );
    }

    if (isImage && typedFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image too large. Max 5MB allowed.' },
        { status: 400 }
      );
    }

    if (isVideo && typedFile.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Video too large. Max 50MB allowed.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const uploadBody = new FormData();
    uploadBody.append('file', `data:${file.type};base64,${base64}`);
    uploadBody.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const resourceType = isVideo ? 'video' : 'image';
    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
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
    const thumbUrl = isVideo
      ? secureUrl?.replace('/upload/', '/upload/so_1,c_scale,w_400/') ?? secureUrl
      : secureUrl?.replace('/upload/', '/upload/c_scale,w_300/') ?? secureUrl;

    return NextResponse.json({
      success: true,
      secureUrl,
      publicId: data.public_id,
      thumbnailUrl: thumbUrl,
      resourceType,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
