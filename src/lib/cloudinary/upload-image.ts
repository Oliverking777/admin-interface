/**
 * Uploads an image straight from the browser to Cloudinary (unsigned upload) and returns its secure URL.
 * That URL is what the backend stores as productImageUrl.
 *
 * Needs two public environment variables (.env.local):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   your cloud name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET   an UNSIGNED upload preset
 *
 * This does not go through apiClient on purpose: that client targets our backend (base URL, session cookie,
 * CSRF header), none of which belongs on a request to Cloudinary.
 */

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = IMAGE_ACCEPT.split(",");

/** Returns a message when the file cannot be uploaded, otherwise null. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Choose a JPG, PNG or WebP image.";
  if (file.size > IMAGE_MAX_BYTES) return "The image is larger than 5 MB.";
  return null;
}

type UploadOptions = {
  /** Cloudinary folder, e.g. "yah-enterprise/products". */
  folder?: string;
  /** Called with 0 to 100 while the file is being sent. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

export function uploadImage(file: File, { folder, onProgress, signal }: UploadOptions = {}): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) return Promise.reject(new Error(problem));

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    return Promise.reject(
      new Error("Image upload is not configured. Set the Cloudinary cloud name and upload preset."),
    );
  }
  if (signal?.aborted) return Promise.reject(new Error("Upload cancelled."));

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let body: { secure_url?: string; error?: { message?: string } } | undefined;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url) {
        resolve(body.secure_url);
      } else {
        reject(new Error(body?.error?.message ?? "The image could not be uploaded."));
      }
    };
    xhr.onerror = () => reject(new Error("Could not reach the image service. Check your connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);
    if (folder) form.append("folder", folder);
    xhr.send(form);
  });
}