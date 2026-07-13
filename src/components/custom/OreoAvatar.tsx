"use client";

/**
 * OreoAvatar
 * ----------
 * Shows a real photo (src) or a deterministic @oreo-design/avatar SVG.
 * Both `palette` and `shape` are derived from the name hash so the same
 * person always gets the same avatar — and every person looks different.
 */
import { Avatar } from "@oreo-design/avatar/react";
import type { ShapeId } from "@oreo-design/avatar";
import { cn } from "@/lib/utils";

interface OreoAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/* Real palette IDs from the @oreo-design/avatar package */
const PALETTES = [
  "rose-milk", "peach-cream", "mint-milk", "aurora-pink", "lilac-silk",
  "blue-cream", "jade-cream", "coral-mist", "lemon-mint", "violet-peach",
  "magenta-void", "teal-void", "amber-dusk", "sky-melon", "grapefruit",
  "lavender-lime", "aqua-orchid", "honeydew", "plum-gold", "ice-berry",
  "apricot-mint", "candy-blue", "raspberry-cream", "spring-glow", "sunset-punch",
  "moon-pearl", "seafoam-rose", "blueberry-milk", "mango-iris", "forest-neon",
  "cotton-candy", "lime-sorbet", "cherry-cola", "opal-mint", "peach-lilac",
  "cyan-flame", "orchid-night", "pistachio-blush", "lagoon-gold", "vanilla-sky",
] as const;

/* All shape IDs from the package */
const SHAPES: ShapeId[] = ["bloom", "silk", "flare", "nova", "void", "jade"];

/** djb2-style stable integer hash */
function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function nameToPalette(name: string): string {
  return PALETTES[strHash(name) % PALETTES.length];
}

function nameToShape(name: string): ShapeId {
  // Offset the seed so shape and palette are independent
  return SHAPES[(strHash(name + "\x00shape") >>> 4) % SHAPES.length];
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
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Avatar
          variantId={name}
          palette={nameToPalette(name)}
          shape={nameToShape(name)}
          size={size}
          className="w-full h-full"
        />
      )}
    </div>
  );
}
