// Official icons of a goal, published by the United Nations, in Spanish.
// "inverse": the goal's colour on a transparent background. It may only be shown over white.
// "filled": the white pictogram on the goal's colour.
export type SdgIconVariant = "inverse" | "filled";

export const sdgIcon = (goal: number, variant: SdgIconVariant = "inverse") => {
  const number = String(goal).padStart(2, "0");
  return variant === "filled" ? `/images/ods/S-WEB-Goal-${number}.png` : `/images/ods/S_SDG_Icons_Inverted_Transparent_WEB-${number}.png`;
};

// Pixel size of the official files.
export const sdgIconSize: Record<SdgIconVariant, number> = { inverse: 1536, filled: 1500 };
