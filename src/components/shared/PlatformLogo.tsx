import type { Platform } from "@/lib/platforms";

/** Plattformens logotyp (SVG) eller kanalens ikon, i färgen currentColor. */
export default function PlatformLogo({ platform, size = 24 }: { platform: Pick<Platform, "path" | "icon">; size?: number }) {
  if (platform.path) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden className="shrink-0">
        <path d={platform.path} />
      </svg>
    );
  }
  const Icon = platform.icon;
  return Icon ? <Icon width={size} height={size} strokeWidth={2} aria-hidden className="shrink-0" /> : <span style={{ width: size, height: size }} className="shrink-0" aria-hidden />;
}
