/**
 * Compresses an image file in the browser (canvas resize + JPEG quality
 * step-down) until the resulting base64 data URI is under `maxBytes`.
 * Used for profile photos and image attachments (target: < 100KB).
 */
export function compressImage(file: File, maxBytes = 100 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser"));
          return;
        }

        let quality = 0.85;
        let scale = Math.min(1, 1280 / Math.max(img.width, img.height));

        function render(): string {
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx!.clearRect(0, 0, canvas.width, canvas.height);
          ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/jpeg", quality);
        }

        let dataUrl = render();
        let attempts = 0;
        // Base64 is ~4/3 the size of the raw bytes it encodes.
        while (dataUrl.length * 0.75 > maxBytes && attempts < 25) {
          if (quality > 0.35) {
            quality -= 0.1;
          } else {
            scale *= 0.85;
          }
          dataUrl = render();
          attempts++;
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Reads a file as-is (no re-encoding) — used for GIFs so animation is preserved. */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
