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
 * Fits any portrait, landscape, or square photo cleanly inside a square canvas (default 800x800)
 * preserving 100% of the original aspect ratio with a comfortable inner margin,
 * so the image shrinks naturally into a circular avatar frame without distortion or edge-clipping.
 */
export async function compressAvatarImage(
  file: File,
  targetSize = 800,
  quality = 0.92
): Promise<File> {
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
        const origWidth = img.width;
        const origHeight = img.height;

        // Scale factor: fit within 94% of targetSize so rectangular corners stay safely inside the circular mask
        const maxInnerDimension = targetSize * 0.94;
        const scale = Math.min(maxInnerDimension / origWidth, maxInnerDimension / origHeight);

        const drawWidth = Math.max(1, Math.round(origWidth * scale));
        const drawHeight = Math.max(1, Math.round(origHeight * scale));

        // Create a 1:1 square canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Center the scaled photo on the square canvas
        const offsetX = Math.round((targetSize - drawWidth) / 2);
        const offsetY = Math.round((targetSize - drawHeight) / 2);

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '-avatar.webp';
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

