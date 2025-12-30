import { NextRequest, NextResponse } from 'next/server';
import {
  calculateImageHash,
  getOrCreateBackground,
  findBackgroundByHash,
} from '@/lib/backgroundDedup';
import dbUtil from '@/app/utils/db.util';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

/**
 * POST /api/uploads/background
 * 
 * Upload or reuse a background image with deduplication
 * - Calculates image hash
 * - Checks for existing background
 * - Reuses if exists, uploads if new
 * 
 * Request body (FormData):
 * - file: File (image file)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "cloudinary_url": "https://...",
 *     "cloudinary_public_id": "ecard/...",
 *     "image_hash": "abc123...",
 *     "width": 1200,
 *     "height": 800,
 *     "reused": false
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  return dbUtil.normal(
    async () => {
      // Parse FormData instead of JSON
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, message: 'file is required' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Calculate hash before upload
      const imageHash = calculateImageHash(imageBuffer);

      // Check if background already exists
      const existingBg = await findBackgroundByHash(imageHash);

      if (existingBg) {
        return NextResponse.json(
          {
            success: true,
            message: 'Background already exists (reused from cache)',
            data: {
              id: existingBg.id,
              cloudinary_url: existingBg.cloudinary_url,
              cloudinary_public_id: existingBg.cloudinary_public_id,
              image_hash: existingBg.image_hash,
              width: existingBg.width,
              height: existingBg.height,
              reused: true,
            },
          },
          { status: 200 }
        );
      }

      // Upload new background to Cloudinary directly
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        return NextResponse.json(
          { success: false, message: 'Cloudinary configuration missing' },
          { status: 500 }
        );
      }

      const base64 = imageBuffer.toString('base64');
      const uploadBody = new FormData();
      uploadBody.append('file', `data:${file.type};base64,${base64}`);
      uploadBody.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: uploadBody,
        }
      );

      if (!cloudinaryRes.ok) {
        const errText = await cloudinaryRes.text();
        console.error('Cloudinary upload failed:', errText);
        return NextResponse.json(
          { success: false, message: 'Failed to upload to Cloudinary' },
          { status: 500 }
        );
      }

      const cloudinaryData = await cloudinaryRes.json();
      const uploadResult = {
        secureUrl: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
      };

      // Register in database
      const bgAsset = await getOrCreateBackground(
        uploadResult.publicId,
        uploadResult.secureUrl,
        imageHash,
        1200,  // Default width
        800,   // Default height
        imageBuffer.length
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Background uploaded and registered',
          data: {
            id: bgAsset.id,
            cloudinary_url: bgAsset.cloudinary_url,
            cloudinary_public_id: bgAsset.cloudinary_public_id,
            image_hash: bgAsset.image_hash,
            width: bgAsset.width,
            height: bgAsset.height,
            reused: false,
          },
        },
        { status: 201 }
      );
    },
    (error: Error) => {
      console.error('Background upload error:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
  );
}


