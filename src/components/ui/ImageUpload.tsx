"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { IMAGE_ACCEPT, uploadImage } from "@/lib/cloudinary/upload-image";

type ImageUploadProps = {
  /** Id of the "Choose image" button, so a FormField label can point at it. */
  id: string;
  /** Current image URL ("" when there is none). */
  value: string;
  /** Called with the Cloudinary URL after a successful upload, or "" when the image is removed. */
  onChange: (url: string) => void;
  /** Lets the form block submitting while a file is still uploading. */
  onBusyChange?: (busy: boolean) => void;
  /** Cloudinary folder for the uploaded files. */
  folder?: string;
  invalid?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
};

/** Pick an image from the device, upload it to Cloudinary, and hand its URL to the form. */
export default function ImageUpload({
  id,
  value,
  onChange,
  onBusyChange,
  folder,
  invalid = false,
  disabled = false,
  ...rest
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancel an upload that is still running when the form goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(file: File) {
    const controller = new AbortController();
    abortRef.current = controller;
    const preview = URL.createObjectURL(file);

    setError(null);
    setProgress(0);
    setLocalPreview(preview);
    setUploading(true);
    onBusyChange?.(true);
    try {
      const url = await uploadImage(file, { folder, onProgress: setProgress, signal: controller.signal });
      onChange(url);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "The image could not be uploaded.");
    } finally {
      URL.revokeObjectURL(preview);
      if (!controller.signal.aborted) {
        setLocalPreview(null);
        setUploading(false);
        onBusyChange?.(false);
      }
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again after an error
    if (file) void handleFile(file);
  }

  const shown = localPreview ?? value;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={cn(
          "flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border bg-muted/40",
          invalid || error ? "border-red-600" : "border-border",
        )}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Product preview" className={cn("h-full w-full object-cover", uploading && "opacity-60")} />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-muted-foreground" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" />
            <circle cx="9" cy="10" r="1.75" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={handleChange}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            id={id}
            variant="secondary"
            size="sm"
            disabled={disabled || uploading}
            loading={uploading}
            onClick={() => inputRef.current?.click()}
            aria-describedby={rest["aria-describedby"]}
          >
            {uploading ? "Uploading..." : value ? "Replace image" : "Choose image"}
          </Button>
          {value && !uploading && (
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>

        {uploading && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Upload progress"
            className="h-1.5 w-full max-w-xs bg-muted"
          >
            <div className="h-full bg-primary transition-all motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
        )}
      </div>
    </div>
  );
}