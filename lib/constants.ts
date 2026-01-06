export const PRESET_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
] as const;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];
export const DEFAULT_TEMPLATE_IMAGE = '/images/template.png';
export const MAX_IMAGE_MB = 50; // 50 Megabytes
export const MAX_VIDEO_MB = 500; // 500 Megabytes
export const UPLOAD_CHUNK_SIZE_MB = 50; // 50 Megabytes - chunk size for client uploads

// Cookie configuration
export const COOKIE_OPTIONS = {
  AUTH_TOKEN: {
    name: '__auth_token__',
    httpOnly: true,
    secure: false, // Set to false in development, true in production
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
} as const;

// Placeholder when color options are sourced from the database
export const COLOR_OPTIONS: { label: string; value: string }[] = [];
