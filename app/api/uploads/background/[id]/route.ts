import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundById } from '@/lib/backgroundDedup';
import dbUtil from '@/app/utils/db.util';

/**
 * GET /api/uploads/background/[id]
 * 
 * Get background asset details by ID
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "cloudinary_public_id": "ecard/...",
 *     "cloudinary_url": "https://...",
 *     "image_hash": "abc123...",
 *     "width": 1200,
 *     "height": 800
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return dbUtil.normal(
    async () => {
      const { id } = params;

      if (!id || isNaN(Number(id))) {
        return NextResponse.json(
          { success: false, message: 'Invalid background ID' },
          { status: 400 }
        );
      }

      const background = await getBackgroundById(Number(id));

      if (!background) {
        return NextResponse.json(
          { success: false, message: 'Background not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: background,
        },
        { status: 200 }
      );
    },
    (error: Error) => {
      console.error('Get background error:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
  );
}
