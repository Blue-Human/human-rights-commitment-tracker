import Image from "next/image";
import { sdgIcon } from "@/lib/sdg-icon";

// The official icon of a goal, as published by the United Nations. Its guidelines require it to be
// shown whole (number, name and pictogram), square, in its own colours and, in this inverse
// version, over white only. It fills the width of its container and nothing is drawn over it.
// The original file is served as it is, without recompression, so that it stays sharp at any size.
export function SdgIcon({ goal, sizes, priority = false }: { goal: { number: number; name: string }; sizes: string; priority?: boolean }) {
  return (
    <Image
      src={sdgIcon(goal.number)}
      alt={`ODS ${goal.number}: ${goal.name}`}
      width={1536}
      height={1536}
      sizes={sizes}
      priority={priority}
      unoptimized
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}
