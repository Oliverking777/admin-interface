/**
 * Makes the browser download a file the app already holds (e.g. a CSV export).
 * Browser only: call it from an event handler or effect, never during server rendering.
 */
export function saveFile(content: Blob, filename: string): void {
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}