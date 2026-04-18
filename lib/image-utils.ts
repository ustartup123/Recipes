/**
 * Client-side image resize and compression utilities for AI advisor.
 * Balances quality with cost (small payloads for upload / vision APIs).
 */

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;
const MAX_IMAGES = 4;

export { MAX_IMAGES };

/**
 * Resize an image file to max 1024px on its longest side, compress as JPEG.
 * Returns a base64 data URL and the mime type.
 */
export function resizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

      resolve({ base64, mimeType: "image/jpeg" });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

/**
 * Process multiple image files: resize and compress each one.
 * Enforces the MAX_IMAGES limit.
 */
export async function processImages(
  files: FileList | File[]
): Promise<{ base64: string; mimeType: string }[]> {
  const fileArray = Array.from(files).slice(0, MAX_IMAGES);
  return Promise.all(fileArray.map(resizeImage));
}
