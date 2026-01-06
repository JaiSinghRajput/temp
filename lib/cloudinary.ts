/**
 * Upload image to Cloudinary
 * @param file - Image file to upload
 * @returns Upload result with secure URL and public ID
 */

import { UPLOAD_CHUNK_SIZE_MB } from './constants';

const FolderPath = 'next-canvas';
const CHUNK_SIZE = UPLOAD_CHUNK_SIZE_MB * 1024 * 1024;

export async function uploadToCloudinary(file: File) {
  // For files under 50MB, use regular upload
  if (file.size <= CHUNK_SIZE) {
    return uploadSingleChunk(file);
  }

  // For files over 50MB, send as formData but without converting to base64
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`/api/uploads/cloudinary?folder=${encodeURIComponent(FolderPath)}`, {
      method: 'POST',
      body: formData,
    });

    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Invalid response type:', contentType, 'Status:', res.status);
      // If 413, file is too large
      if (res.status === 413) {
        throw new Error('File too large for upload. Maximum 500MB allowed.');
      }
      throw new Error(`Invalid response from server. Status: ${res.status}`);
    }

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return {
      secureUrl: result.secureUrl as string,
      publicId: result.publicId as string,
      thumbnailUrl: result.thumbnailUrl as string,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(error?.message || 'Failed to upload file');
  }
}

async function uploadSingleChunk(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`/api/uploads/cloudinary?folder=${encodeURIComponent(FolderPath)}`, {
      method: 'POST',
      body: formData,
    });

    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Invalid response type:', contentType, 'Status:', res.status);
      if (res.status === 413) {
        throw new Error('File too large for upload. Maximum 500MB allowed.');
      }
      throw new Error(`Invalid response from server. Status: ${res.status}`);
    }

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return {
      secureUrl: result.secureUrl as string,
      publicId: result.publicId as string,
      thumbnailUrl: result.thumbnailUrl as string,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(error?.message || 'Failed to upload file');
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID to delete
 */
export async function deleteFromCloudinary(publicId: string) {
  try {
    await fetch(`/api/uploads/cloudinary/${encodeURIComponent(publicId)}?folder=${encodeURIComponent(FolderPath )}`, {
      method: 'DELETE',
    });
  } catch (err) {
  }
}

/**
 * Convert a data URL (base64) into a File and upload to Cloudinary.
 * Useful for uploading canvas thumbnails.
 */
export async function uploadDataUrlToCloudinary(dataUrl: string, filename = 'thumbnail.png') {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  return uploadToCloudinary(file);
}
;