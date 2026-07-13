"use client";

/**
 * OreoAvatar
 * ----------
 * Drop-in avatar that shows:
 *   • The user's real photo when `src` is provided
 *   • A deterministic @oreo-design/avatar SVG otherwise
 *
 * Props mirror a standard <img>-style avatar:
 *   src?         - real image URL (base64 or https)
 *   name         - person's name (seeds the deterministic avatar + alt text)
 *   size?        - px dimension (default 36)
 *   className?   - extra classes for the outer wrapper
 *   onError?     - forwarded to the real <img>
 */
import { Avatar } from "@oreo-design/avatar/react";
import { cn } from "@/lib/utils";

interface OreoAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/** Pick a stable palette from the name string */
function nameToPalette(name: string): string {
  const palettes = [
    "aurora", "candy", "citrus", "coral", "crimson", "dusk", "ember",
    "forest", "glacier", "gold", "iris", "jade", "lavender", "mint",
    "moss", "night", "ocean", "peach", "plum", "rose", "ruby", "sage",
    "sand", "sky", "slate", "steel", "storm", "teal", "terra", "twilight",
    "violet", "wheat", "wine", "zinc",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

export function OreoAvatar({ src, name, size = 36, className }: OreoAvatarProps) {
  const hasImage = Boolean(src);

  return (
    <div
      className={cn("relative rounded-full overflow-hidden shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {hasImage ? (
        <img
          src={src!}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If real image fails to load, hide it — the Avatar below shows through
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Avatar
          variantId={name}
          palette={nameToPalette(name)}
          size={size}
          className="w-full h-full"
        />
      )}
    </div>
  );
}
