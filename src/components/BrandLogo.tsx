import { Box, type SxProps, type Theme } from "@mui/material";
import { brand, displayFont } from "@/brand";

// The HRCI logo: the isotype (the favicon artwork) and the name set in TWK Everett.
// Every measure is in `em`, taken from the supplied artwork, so the whole logo scales with its font size:
// a cap height of 15 px on 19.7 px type, the isotype as tall as both lines, 27 px between baselines.
// "Human Rights" and "HRCI" in Everett Medium and the logo blue; the rest in Everett Light, white.
export function BrandLogo({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Box
      component="span"
      sx={[
        {
          display: "inline-flex",
          alignItems: "center",
          gap: "0.61em",
          fontFamily: displayFont,
          fontSize: 16,
          lineHeight: 1,
          color: "#ffffff",
          whiteSpace: "nowrap",
          fontKerning: "normal",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="img"
        src="/images/blue%20human%20(9).png"
        alt=""
        width={335}
        height={324}
        sx={{ display: "block", height: "2.335em", width: "auto", flexShrink: 0 }}
      />
      <Box component="span" sx={{ display: "flex", flexDirection: "column", lineHeight: "1.37em" }}>
        <Box component="span" sx={{ display: "block", fontWeight: 500, color: brand.logo }}>Human Rights</Box>
        <Box component="span" sx={{ display: "flex", alignItems: "center", fontWeight: 300, letterSpacing: "-0.03em" }}>
          Commitments Institute
          <Box component="span" aria-hidden sx={{ display: "block", width: "max(1px, .065em)", height: "1.27em", ml: ".4em", mr: ".457em", bgcolor: "currentColor" }} />
          <Box component="span" sx={{ fontWeight: 500, letterSpacing: "-0.04em", color: brand.logo }}>HRCI</Box>
        </Box>
      </Box>
    </Box>
  );
}
