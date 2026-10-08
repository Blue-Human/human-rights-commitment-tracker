import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { formatShare, type DimensionCode } from "@/lib/hrct";
import { FrameworkCrossing } from "./FrameworkCrossing";

type Props = {
  total: number;
  accepted: number;
  partiallyAccepted: number;
  noted: number;
  // Recommendations with at least one human-security dimension.
  classified: number;
  // Recommendations related to the 2030 Agenda, and the goals and targets they reach. Null when the links could not be read.
  sdg: { linked: number; goals: number; targets: number } | null;
  // Recommendations shared by each dimension and each goal. Null when there is nothing to cross.
  crossing: {
    dimensions: { code: DimensionCode; name: string; total: number }[];
    goals: { number: number; name: string; color: string; total: number }[];
    pairs: { code: DimensionCode; goal: number; count: number }[];
    both: number;
  } | null;
};

// A/HRC/60/8, paragraph 1: the review was held on 30 April 2025.
const REVIEW_YEAR = 2025;

// On a computer screen the whole section fits below the site header, so that nothing of it is left
// under the fold. A window that is not tall gets a smaller headline and tighter text first; the
// diagram keeps its full height while the window allows it and gives way only on a short one.
// `around` is what the page stacks above and below the diagram: the header and the rest of this section.
const WIDE = "@media (min-width:1200px)";
const COMPACT = "@media (min-width:1200px) and (max-height:799.95px)";
const SHORT = "@media (min-width:1200px) and (max-height:689.95px)";
const DIAGRAM = { full: 456, least: 340 };
const diagramHeight = (around: number) => `clamp(${DIAGRAM.least}px, calc(100svh - ${around}px), ${DIAGRAM.full}px)`;
const AROUND = { compact: 283, short: 255 };

const hairline = "rgba(255,255,255,.16)";
const quiet = "rgba(255,255,255,.72)";
// The headline is set in the serif of the same family as the rest of the site.
const serif = 'var(--font-serif), Georgia, "Times New Roman", serif';

// What the tracker holds, in one view: what Spain received and how it responded, and how the
// recommendations cross with human security and the 2030 Agenda.
export function EpuResults({ total, accepted, partiallyAccepted, noted, classified, sdg, crossing }: Props) {
  const response = [
    { label: "Aceptadas", value: accepted, color: "#00a3e0" },
    { label: "Aceptadas parcialmente", value: partiallyAccepted, color: "#9bdcf5" },
    { label: "Anotadas, sin aceptar", value: noted, color: "#8496a8" },
  ];
  // Where the figures come from. On a wide screen it closes the text column, level with the caption
  // of the diagram; on a narrower one, where the diagram follows the text, it closes the section.
  const source = (sx: object) => (
    <Typography variant="caption" sx={{ color: quiet, lineHeight: 1.6, "& a": { color: "inherit", textUnderlineOffset: "3px" }, ...sx }}>
      Fuente oficial: A/HRC/60/8 y A/HRC/60/8/Add.1 · Consejo de Derechos Humanos. Clasificaciones y valoraciones: Blue Human, según su <Link href="/methodology">metodología</Link>.
    </Typography>
  );

  return (
    <Box component="section" aria-labelledby="results-heading" sx={{
      position: "relative",
      overflow: "hidden",
      isolation: "isolate",
      bgcolor: "primary.main",
      backgroundImage: 'url("/images/ods/Untitled%20design%20-%202026-10-06T193326.870.png")',
      backgroundSize: "cover",
      backgroundPosition: "right center",
      backgroundRepeat: "no-repeat",
      color: "#fff",
      "--crossing-height": `${DIAGRAM.full}px`,
      [WIDE]: { "--crossing-height": diagramHeight(AROUND.compact) },
      [SHORT]: { "--crossing-height": diagramHeight(AROUND.short), "--crossing-reading": "3.4rem" },
    }}>
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, pt: { xs: 4.5, md: 5, lg: 4 }, pb: { xs: 3.5, lg: 3 }, [COMPACT]: { pt: 3, pb: 2.5 }, [SHORT]: { pt: 2, pb: 2 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: crossing ? "minmax(0,5fr) minmax(0,7fr)" : "minmax(0,1fr)" }, columnGap: 8, rowGap: { xs: 5, md: 6 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", maxWidth: crossing ? { xs: 720, lg: "none" } : 860 }}>
            <Typography id="results-heading" variant="h1" sx={{ fontFamily: serif, fontWeight: 400, fontSize: { xs: "2.45rem", sm: "3.1rem", lg: "3.5rem" }, lineHeight: 1.08, letterSpacing: "-.02em", [COMPACT]: { fontSize: "2.9rem", textWrap: "balance" }, [SHORT]: { fontSize: "2.45rem" } }}>
              Seguimiento de los compromisos de derechos humanos de España
            </Typography>
            <Typography sx={{ mt: { xs: 2, md: 2.5, lg: 2 }, fontSize: { xs: "1.02rem", md: "1.1rem" }, lineHeight: 1.65, color: "rgba(255,255,255,.86)", [COMPACT]: { mt: 1.5, fontSize: "1rem", lineHeight: 1.55 }, [SHORT]: { mt: 1.25, fontSize: ".95rem", lineHeight: 1.5 } }}>
              Las <Box component="strong" sx={{ color: "#fff", fontWeight: 600 }}>{total} recomendaciones</Box> que España recibió en su examen de {REVIEW_YEAR} ante el Consejo de Derechos Humanos, seguidas una a una con evidencias públicas.
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: { xs: 3, lg: 2.5 }, [COMPACT]: { mt: 2 }, [SHORT]: { mt: 1.5 } }}>
              <Button href="#recomendaciones" variant="contained" color="secondary" sx={{ "&.Mui-focusVisible": { outlineColor: "#fff" } }}>Ver las recomendaciones</Button>
              <Button href="#seguridad-humana" variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,.4)", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,.08)" }, "&.Mui-focusVisible": { outlineColor: "#fff" } }}>Impacto en la seguridad humana</Button>
            </Box>

            <Box sx={{ mt: { xs: 5, lg: "auto" }, pt: { lg: 3 }, [COMPACT]: { pt: 2 }, [SHORT]: { pt: 1.5 } }}>
              <Box role="img" aria-label={`Respuesta de España. ${response.map((r) => `${r.label}: ${r.value}`).join(". ")}`} sx={{ display: "flex", gap: "2px", height: 12 }}>
                {response.filter((r) => r.value > 0).map((r) => (
                  <Box key={r.label} title={`${r.label}: ${r.value} (${formatShare(r.value, total)})`} sx={{ flex: `${r.value} 0 0`, minWidth: 6, bgcolor: r.color }} />
                ))}
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: { xs: 1.5, sm: 3 }, mt: 2 }}>
                {response.map((r) => (
                  <Box key={r.label}>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                      <Box aria-hidden sx={{ width: 10, height: 10, bgcolor: r.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: { xs: "1.7rem", md: "2rem" }, fontWeight: 500, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{r.value}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: .75, lineHeight: 1.35 }}>{r.label}</Typography>
                    <Typography variant="caption" sx={{ color: quiet }}>{formatShare(r.value, total)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {source({ display: { xs: "none", lg: "block" }, mt: 2, [SHORT]: { mt: 1.25 } })}
          </Box>

          {crossing && <FrameworkCrossing {...crossing} />}
        </Box>

        {source({ display: { xs: "block", lg: "none" }, mt: 3.5 })}
      </Container>
    </Box>
  );
}
