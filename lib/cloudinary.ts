/**
 * Upload image to Cloudinary
 * @param file - Image file to upload
 * @returns Upload result with secure URL and public ID
 */
export async function uploadToCloudinary(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/uploads/cloudinary', {
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
    await fetch(`/api/uploads/cloudinary/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Failed to delete Cloudinary image:', err);
  }
}
