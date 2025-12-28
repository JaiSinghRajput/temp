/**
 * Upload image to Cloudinary
 * @param file - Image file to upload
 * @returns Upload result with secure URL and public ID
 */
const FolderPath = 'next-canvas';
export async function uploadToCloudinary(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/uploads/cloudinary?folder=${encodeURIComponent(FolderPath)}`, {
    method: 'POST',
    body: formData,
  });
  
  const result = await res.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return {
    secureUrl: result.secureUrl as string,
    publicId: result.publicId as string,
    thumbnailUrl: result.thumbnailUrl as string,
  };
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
    console.error('Failed to delete Cloudinary image:', err);
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
