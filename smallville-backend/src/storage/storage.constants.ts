export const IMAGE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

export type AllowedImageMimeType =
  (typeof IMAGE_UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number];
