import fs from 'fs';
import path from 'path';

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'knowvia-files';
  return { url, key, bucket };
};

export interface UploadResult {
  fileUrl: string;
  isCloud: boolean;
}

/**
 * Persists an uploaded file. If Supabase Storage is configured, uploads to Supabase
 * and deletes the local temporary file. Otherwise falls back to local /uploads/ storage.
 */
export async function persistUploadedFile(
  localFilePath: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const { url: supabaseUrl, key: supabaseKey, bucket: supabaseBucket } = getSupabaseConfig();

  if (supabaseUrl && supabaseKey) {
    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const destinationPath = `uploads/${filename}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${supabaseBucket}/${destinationPath}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': mimeType || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: fileBuffer,
      });

      if (response.ok) {
        // Clean up temporary local file
        if (fs.existsSync(localFilePath)) {
          try {
            fs.unlinkSync(localFilePath);
          } catch {
            // ignore cleanup error
          }
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${destinationPath}`;
        return {
          fileUrl: publicUrl,
          isCloud: true,
        };
      } else {
        const errText = await response.text();
        console.warn(
          `[StorageService] Supabase upload failed with status ${response.status}: ${errText}. Using local storage fallback.`
        );
      }
    } catch (err) {
      console.warn('[StorageService] Error connecting to Supabase Storage, using local fallback:', err);
    }
  }

  return {
    fileUrl: `/uploads/${filename}`,
    isCloud: false,
  };
}

/**
 * Deletes an uploaded file from either Supabase Storage or local disk.
 */
export async function deleteUploadedFile(fileUrl: string): Promise<void> {
  if (!fileUrl) return;

  const { url: supabaseUrl, key: supabaseKey, bucket: supabaseBucket } = getSupabaseConfig();

  // Cloud file deletion
  if (supabaseUrl && supabaseKey && fileUrl.includes(supabaseBucket)) {
    try {
      const parts = fileUrl.split(`${supabaseBucket}/`);
      if (parts.length > 1) {
        const objectPath = parts[1];
        const deleteUrl = `${supabaseUrl}/storage/v1/object/${supabaseBucket}/${objectPath}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
        });
      }
      return;
    } catch (err) {
      console.warn('[StorageService] Error deleting from Supabase Storage:', err);
    }
  }

  // Local disk deletion fallback
  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    const filename = path.basename(fileUrl);
    const diskPath = path.join(uploadDir, filename);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.warn('[StorageService] Error deleting local file:', err);
  }
}
