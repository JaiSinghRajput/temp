import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { MAX_IMAGE_MB, MAX_VIDEO_MB } from '@/lib/constants';
import { ALLOWED_IMAGE_TYPES as IMAGE_TYPES, ALLOWED_VIDEO_TYPES as VIDEO_TYPES } from '@/lib/constants';

const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

// Configure Cloudinary v2 SDK (server-side only)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// For App Router with large files, configure maxDuration
export const maxDuration = 300; // 5 minutes


export async function POST(req: Request) {
<<<<<<< HEAD
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return NextResponse.json(
      { success: false, error: 'Cloudinary env vars missing' },
      { status: 500 }
    );
  }

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
  const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 50MB
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];

=======
>>>>>>> 51c19bfdfefe710ccbd52e91435f6e4fe2e46b99
  try {
    const contentType = req.headers.get('content-type') || '';
    
    // Only support multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse multipart form data manually to support large files
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Allowed: images (jpg, png, webp, gif) or video (mp4, mov, mkv, webm).',
        },
        { status: 400 }
      );
    }

    const MAX_IMAGE_BYTES = Number(MAX_IMAGE_MB) * 1024 * 1024;
    const MAX_VIDEO_BYTES = Number(MAX_VIDEO_MB) * 1024 * 1024;

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: `Image too large. Max ${MAX_IMAGE_MB}MB allowed.` },
        { status: 400 }
      );
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
<<<<<<< HEAD
        { success: false, error: 'Video too large. Max 100MB allowed.' },
=======
        { success: false, error: `Video too large. Max ${MAX_VIDEO_MB}MB allowed.` },
>>>>>>> 51c19bfdfefe710ccbd52e91435f6e4fe2e46b99
        { status: 400 }
      );
    }

    // Convert File to stream for upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = isVideo ? 'video' : 'image';

    // Upload to Cloudinary via stream
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Write buffer to stream
      uploadStream.end(buffer);
    });

    const data = uploadResponse as any;
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
