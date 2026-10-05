import Image from "next/image";
import { sdgIcon, type SdgGoal } from "@/lib/sdg";

// The official icon of a goal, as published by the United Nations. Its guidelines require it to be
// shown whole (number, name and pictogram), square and in its own colours: it fills the width of
// its container and nothing is drawn over it.
export function SdgIcon({ goal, sizes, priority = false }: { goal: Pick<SdgGoal, "number" | "name">; sizes: string; priority?: boolean }) {
  return (
    <Image
      src={sdgIcon(goal.number)}
      alt={`ODS ${goal.number}: ${goal.name}`}
      width={1500}
      height={1500}
      sizes={sizes}
      priority={priority}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}
