'use client';

import { uploadToCloudinary } from '@/lib/cloudinary';

interface Props {
  imageUrl: string;
  onChange: (url: string, publicId?: string) => void;
}

export function CardImageUploader({ imageUrl, onChange }: Props) {
  const handleUpload = async (file: File) => {
    const res = await uploadToCloudinary(file);
    onChange(res.secureUrl, res.publicId);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-600">Card Image</label>

      <input
        type="file"
        accept="image/*"
        onChange={(e) =>
          e.target.files && handleUpload(e.target.files[0])
        }
        className="text-sm"
      />

      <input
        value={imageUrl}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Or paste image URL"
      />

      {imageUrl && (
        <img
          src={imageUrl}
          className="rounded-lg border"
          alt="Preview"
        />
      )}
    </div>
  );
}
