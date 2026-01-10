'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { LinkIcon, UploadIcon } from '@/components/ui/Icon';

interface Props {
  imageUrl: string;
  onChange: (url: string, publicId?: string) => void;
  className?: string;
}

const PRIMARY = '#d66e4b';

type Mode = 'upload' | 'url';


export function CardImageUploader({ imageUrl, onChange, className }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<Mode>('upload');

  const cleanUrl = useMemo(() => (imageUrl || '').trim(), [imageUrl]);

  // If url exists -> go URL mode automatically
  useEffect(() => {
    if (cleanUrl) setMode('url');
  }, [cleanUrl]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);

      const res: any = await uploadToCloudinary(file);

      // ✅ Make response mapping safe (handles any cloudinary wrapper)
      const url =
        res?.secureUrl ||
        res?.secure_url ||
        res?.url ||
        res?.path ||
        '';

      const publicId =
        res?.publicId ||
        res?.public_id ||
        undefined;

      if (!url) {
        console.error('Upload response missing url:', res);
        return;
      }

      // ✅ Save into parent state
      onChange(url, publicId);

      // ✅ switch to URL mode (so url input + preview shows)
      setMode('url');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* Hidden input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {/* Toggle */}
      <div
        className="rounded-2xl border bg-white p-2 shadow-sm"
        style={{ borderColor: 'rgba(0,0,0,0.10)' }}
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className="rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition"
            style={{
              borderColor: mode === 'upload' ? PRIMARY : 'rgba(0,0,0,0.10)',
              backgroundColor: mode === 'upload' ? 'rgba(214,110,75,0.12)' : 'white',
              color: mode === 'upload' ? PRIMARY : '#111827',
            }}
          >
            <UploadIcon className="w-4 h-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className="rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition"
            style={{
              borderColor: mode === 'url' ? PRIMARY : 'rgba(0,0,0,0.10)',
              backgroundColor: mode === 'url' ? 'rgba(214,110,75,0.12)' : 'white',
              color: mode === 'url' ? PRIMARY : '#111827',
            }}
          >
            <LinkIcon className="w-4 h-4" />
            URL
          </button>
        </div>
      </div>
      {/* Upload Mode */}
      {mode === 'upload' && (
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(214,110,75,0.12)', color: PRIMARY }}
            >
              <UploadIcon />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {uploading ? 'Uploading...' : 'Click to upload image'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                PNG / JPG / WEBP
              </p>
            </div>

            <span
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
              style={{
                backgroundColor: uploading ? 'rgba(0,0,0,0.35)' : PRIMARY,
              }}
            >
              {uploading ? 'Wait' : 'Browse'}
            </span>
          </div>

          {uploading && (
            <div className="mt-4 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-full w-2/3 animate-pulse rounded-full"
                style={{ backgroundColor: PRIMARY }}
              />
            </div>
          )}
        </div>
      )}
      {/* URL Mode */}
      {mode === 'url' && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600">Image URL</label>

          <input
            value={cleanUrl}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none"
            style={{ borderColor: 'rgba(0,0,0,0.10)' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = PRIMARY;
              e.currentTarget.style.boxShadow = `0 0 0 4px rgba(214,110,75,0.20)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
            }}
            placeholder="https://..."
          />
        </div>
      )}

      {/* ✅ ALWAYS show preview if url exists */}
      {cleanUrl ? (
        <div
          className="rounded-2xl border bg-white p-3 shadow-sm"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }}
        >
          <div className="text-xs font-semibold text-gray-600 mb-2">Preview</div>
          <img
            key={cleanUrl}  // ✅ forces refresh if url changes
            src={cleanUrl}
            alt="Preview"
            className="w-2xl rounded-xl object-contain"
            style={{ borderColor: 'rgba(0,0,0,0.08)', maxHeight: 220 }}
            onError={() => console.error('Image failed to load:', cleanUrl)}
          />
        </div>
      ) : null}
    </div>
  );
}
