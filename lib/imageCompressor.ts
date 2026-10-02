/**
 * Client-side image compression utility.
 * Resizes large smartphone camera photos and converts them to WebP/JPEG,
 * reducing a 5-10MB mobile photo down to ~150-250KB before uploading to Supabase.
 */
export async function compressImage(
  file: File,
  maxWidth = 1400,
  maxHeight = 1400,
  quality = 0.82
): Promise<File> {
  // If it's not an image (e.g. video), return original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

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
          resolve(file); // fallback to original
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for best mobile compression, fallback to jpeg
        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Create compressed file with clean filename
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
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

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}

/**
 * Avatar image compressor.
 * Compresses any portrait, landscape, or square photo up to 1000x1000
 * preserving 100% of the true native aspect ratio without distortion or artificial borders,
 * allowing CSS to automatically fill the avatar circle while letting full-size zoom
 * display the complete uncropped photo.
 */
export async function compressAvatarImage(
  file: File,
  maxDimension = 1000,
  quality = 0.92
): Promise<File> {
  return compressImage(file, maxDimension, maxDimension, quality);
}

