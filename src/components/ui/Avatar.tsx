import { cn } from "@/lib/cn";

type AvatarProps = {
  name: string;
  size?: "sm" | "md";
  className?: string;
};

const tones = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
];

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Initials avatar. Decorative: the name is always shown next to it. */
export default function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold",
        size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm",
        tones[hash(name) % tones.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}