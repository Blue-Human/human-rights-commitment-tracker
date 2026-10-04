import { Box, Button, Container, Typography } from "@mui/material";
import { formatShare } from "@/lib/hrct";

type Props = {
  total: number;
  accepted: number;
  partiallyAccepted: number;
  noted: number;
  assessed: number;
  priority: number;
  developments: number;
};

// A/HRC/60/8, paragraphs 1 and 25.
const REVIEW_DATE = "30 de abril de 2025";
const DELEGATIONS = 120;

const hairline = "rgba(255,255,255,.16)";
const quiet = "rgba(255,255,255,.72)";

// The outcome of the review in figures: what Spain received, how it responded and where follow-up stands.
export function EpuResults({ total, accepted, partiallyAccepted, noted, assessed, priority, developments }: Props) {
  const response = [
    { label: "Aceptadas", value: accepted, color: "#00a3e0" },
    { label: "Aceptadas parcialmente", value: partiallyAccepted, color: "#9bdcf5" },
    { label: "Anotadas, sin aceptar", value: noted, color: "#8496a8" },
  ];
  const figures: [string, string, string?][] = [
    [String(DELEGATIONS), "delegaciones intervinieron en el diálogo con España"],
    [String(priority), "recomendaciones prioritarias para Blue Human"],
    [String(assessed), "valoraciones de cumplimiento completadas", `de ${total}`],
    [String(developments), "novedades en seguimiento"],
  ];

  return (
    <Box component="section" aria-labelledby="results-heading" sx={{ bgcolor: "primary.main", color: "#fff" }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 3.5, md: 4.5 } }}>
        <Typography variant="overline" sx={{ display: "block", color: quiet, borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5, lineHeight: 1.7 }}>
          España · Examen Periódico Universal · Cuarto ciclo
        </Typography>
        <Typography id="results-heading" variant="h1" sx={{ fontSize: { xs: "1.7rem", md: "2.2rem" }, mt: 1.5 }}>
          Seguimiento de los compromisos de derechos humanos
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,4fr) minmax(0,7fr)" }, columnGap: 8, rowGap: 4, alignItems: "end", mt: { xs: 4, md: 6 } }}>
          <Box>
            <Typography sx={{ fontSize: { xs: "5rem", md: "7.5rem" }, fontWeight: 500, lineHeight: .85, letterSpacing: "-.045em" }}>{total}</Typography>
            <Typography sx={{ mt: 2, fontSize: "1.1rem", fontWeight: 500 }}>recomendaciones recibió España</Typography>
            <Typography variant="body2" sx={{ mt: .5, color: quiet }}>Examen del {REVIEW_DATE}</Typography>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: quiet }}>Respuesta de España</Typography>
            <Box role="img" aria-label={response.map((r) => `${r.label}: ${r.value}`).join(". ")} sx={{ display: "flex", gap: "2px", height: 14, mt: 1.25 }}>
              {response.filter((r) => r.value > 0).map((r) => (
                <Box key={r.label} title={`${r.label}: ${r.value} (${formatShare(r.value, total)})`} sx={{ flex: `${r.value} 0 0`, minWidth: 6, bgcolor: r.color }} />
              ))}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: { xs: 1.5, sm: 3 }, mt: 2.5 }}>
              {response.map((r) => (
                <Box key={r.label}>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Box aria-hidden sx={{ width: 10, height: 10, bgcolor: r.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 500, lineHeight: 1 }}>{r.value}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: .75 }}>{r.label}</Typography>
                  <Typography variant="caption" sx={{ color: quiet }}>{formatShare(r.value, total)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3, mt: { xs: 4, md: 6 }, pt: 3, borderTop: `1px solid ${hairline}` }}>
          {figures.map(([value, label, of]) => (
            <Box key={label}>
              <Typography sx={{ fontSize: "1.85rem", fontWeight: 500, lineHeight: 1 }}>
                {value}
                {of && <Box component="span" sx={{ ml: .75, fontSize: ".95rem", fontWeight: 400, color: quiet }}>{of}</Box>}
              </Typography>
              <Typography variant="body2" sx={{ mt: .8, color: quiet }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 3, rowGap: 1.5, mt: { xs: 3.5, md: 4.5 } }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button href="#seguridad-humana" variant="contained" color="secondary" sx={{ "&.Mui-focusVisible": { outlineColor: "#fff" } }}>Impacto en la seguridad humana</Button>
            <Button href="#recomendaciones" variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,.4)", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,.08)" }, "&.Mui-focusVisible": { outlineColor: "#fff" } }}>Ver las recomendaciones</Button>
          </Box>
          <Typography variant="caption" sx={{ color: quiet }}>Fuente oficial: A/HRC/60/8 y A/HRC/60/8/Add.1 · Consejo de Derechos Humanos</Typography>
        </Box>
      </Container>
    </Box>
  );
}
