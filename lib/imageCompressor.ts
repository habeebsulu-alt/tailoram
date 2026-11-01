/**
 * Client-side image compression & format normalization utility.
 * - Supports JPEG, PNG, WebP, and iPhone HEIC / HEIF photos.
 * - Automatically converts Apple HEIC photos to standard JPEG/WebP so all browsers can decode them.
 * - Resizes large smartphone camera photos and converts them to WebP,
 *   reducing a 5-15MB mobile photo down to ~120-200KB before uploading to Supabase.
 */

/**
 * Checks whether a given file is a HEIC or HEIF image.
 */
export function isHeicFile(file: File | Blob): boolean {
  if (!file) return false;
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType.includes('heic') || mimeType.includes('heif')) {
    return true;
  }
  if ('name' in file && typeof file.name === 'string') {
    return /\.(heic|heif)$/i.test(file.name);
  }
  return false;
}

/**
 * Validates whether a file is a supported image (including HEIC).
 */
export function isValidImageFile(file: File): boolean {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  if (isHeicFile(file)) return true;
  return /\.(jpe?g|png|webp|gif|svg|heic|heif)$/i.test(file.name || '');
}

/**
 * Converts an Apple HEIC / HEIF image file into a standard JPEG File in the browser.
 * Uses dynamic import so 'heic2any' is only loaded when a HEIC file is actually uploaded.
 */
export async function convertHeicToJpeg(file: File, quality = 0.9): Promise<File> {
  if (typeof window === 'undefined') {
    return file;
  }

  try {
    const mod = await import('heic2any');
    const heic2any = mod.default || mod;

    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality,
    });

    // heic2any can return a single Blob or an array of Blobs for burst shots
    const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    const cleanBaseName = file.name ? file.name.replace(/\.(heic|heif)$/i, '') : `photo-${Date.now()}`;
    const newFileName = `${cleanBaseName}.jpg`;

    return new File([blob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.error('HEIC conversion failed, falling back to original file:', err);
    return file;
  }
}

/**
 * Normalizes an image file by converting HEIC to JPEG if necessary.
 * Useful before generating preview URLs (e.g. URL.createObjectURL)
 * so Chrome, Edge, and Android can immediately display the image preview.
 */
export async function prepareImageFile(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return await convertHeicToJpeg(file);
  }
  return file;
}

/**
 * Compresses any image (JPEG, PNG, WebP, HEIC) to an optimized WebP file.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<File> {
  // If it's not an image (e.g. video), return original
  if (!isValidImageFile(file)) {
    return file;
  }

  // If HEIC, normalize to JPEG first so HTMLImageElement and canvas can decode it
  let sourceFile = file;
  if (isHeicFile(file)) {
    sourceFile = await convertHeicToJpeg(file, 0.92);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(sourceFile);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceFile); // fallback to source
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // WebP format for optimal mobile bandwidth
        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(sourceFile);
              return;
            }

            // Create compressed file with clean filename
            const cleanName = sourceFile.name.replace(/\.[^/.]+$/, "") + ".webp";
            const compressedFile = new File([blob], cleanName, {
              type: outputMime,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };

      img.onerror = () => resolve(sourceFile);
    };

    reader.onerror = () => resolve(sourceFile);
  });
}

/**
 * Avatar image compressor.
 * Compresses any portrait, landscape, or square photo (including HEIC) up to 1000x1000
 * preserving 100% of the true native aspect ratio without distortion or artificial borders.
 */
export async function compressAvatarImage(
  file: File,
  maxDimension = 1000,
  quality = 0.92
): Promise<File> {
  return compressImage(file, maxDimension, maxDimension, quality);
}
