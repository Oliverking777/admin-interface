export function formatXaf(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount) + " XAF";
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}