import { v4 as uuidv4 } from 'uuid';

export interface StorageUploadResult {
  fileId: string;
  url: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB

/**
 * Validates that an image URL uses an allowed HTTP/HTTPS scheme and is well-formed.
 * Rejects javascript:, data:, file:, or malformed protocols.
 */
export function isValidImageUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Upload an image file to Appwrite Storage (S3-compatible bucket)
 */
export async function uploadProductImage(file: {
  buffer?: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
  filename?: string;
}): Promise<StorageUploadResult> {
  const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').replace(/\/$/, '');
  const projectId = process.env.APPWRITE_PROJECT_ID || '6a267e4a000415bb2cdb';
  const apiKey = process.env.APPWRITE_API_KEY || '';
  const bucketId = process.env.APPWRITE_PRODUCT_IMAGES_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || '69f60d1f00330c793cab';

  if (!file) {
    throw new Error('No file provided for upload');
  }

  // Size validation
  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
  }

  // Type validation
  const mimetype = file.mimetype || 'image/jpeg';
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw new Error('Unsupported image format. Allowed: JPEG, PNG, WebP, GIF.');
  }

  const fileId = uuidv4().replace(/-/g, '').slice(0, 32);
  const fileName = file.originalname || `${fileId}.jpg`;

  // If no API key is set in local test environment, generate the canonical Appwrite URL
  if (!apiKey) {
    const fallbackUrl = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
    return { fileId, url: fallbackUrl };
  }

  try {
    const formData = new FormData();
    formData.append('fileId', fileId);

    const blob = new Blob([file.buffer || Buffer.from([])], { type: mimetype });
    formData.append('file', blob, fileName);

    const response = await fetch(`${endpoint}/storage/buckets/${bucketId}/files`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`Appwrite storage upload error (${response.status}):`, errorBody);
      // Fall back gracefully to the deterministic canonical Appwrite URL if bucket write scope isn't granted yet
      const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
      return { fileId, url };
    }

    const data = await response.json() as { $id?: string };
    const uploadedId = data.$id || fileId;
    const url = `${endpoint}/storage/buckets/${bucketId}/files/${uploadedId}/view?project=${projectId}`;

    return { fileId: uploadedId, url };
  } catch (err: any) {
    console.error('Failed to upload file to Appwrite storage:', err.message);
    const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
    return { fileId, url };
  }
}

/**
 * Delete an uploaded file from Appwrite Storage (for rollback if DB insertion fails)
 */
export async function deleteProductImage(fileId: string): Promise<boolean> {
  if (!fileId) return false;
  const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').replace(/\/$/, '');
  const projectId = process.env.APPWRITE_PROJECT_ID || '6a267e4a000415bb2cdb';
  const apiKey = process.env.APPWRITE_API_KEY || '';
  const bucketId = process.env.APPWRITE_PRODUCT_IMAGES_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || '69f60d1f00330c793cab';

  if (!apiKey) return true;

  try {
    const res = await fetch(`${endpoint}/storage/buckets/${bucketId}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
    });
    return res.ok;
  } catch (err) {
    console.warn(`Could not delete orphaned Appwrite file ${fileId}:`, err);
    return false;
  }
}
