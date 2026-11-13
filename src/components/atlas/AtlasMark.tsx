import { brand } from "@/brand";

// The sign of the Atlas: a globe drawn with its graticule. Decorative; the name always sits beside it.
export function AtlasMark({ size = 28, color = brand.navy, accent = brand.accent }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" style={{ flexShrink: 0, display: "block" }}>
      <circle cx="16" cy="16" r="14" fill="none" stroke={color} strokeWidth="1.8" />
      <ellipse cx="16" cy="16" rx="6.2" ry="14" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M2 16h28" stroke={accent} strokeWidth="1.8" />
      <path d="M4.6 9h22.8M4.6 23h22.8" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}
