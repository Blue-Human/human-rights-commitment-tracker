"use client";

import { useRef, useState } from "react";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import { Box, Button, Typography } from "@mui/material";
import { formatShare, type DimensionCode, type DimensionSummary } from "@/lib/hrct";
import { brand } from "@/theme";
import { useDimensionFilter } from "./DimensionFilter";
import { DimensionIcon } from "./DimensionIcon";

type Props = {
  dimensions: DimensionSummary[];
  // Published recommendations, and how many of them Spain only noted.
  total: number;
  noted: number;
};

// "Seguridad comunitaria" → "Comunitaria": the tiles share the word "Seguridad" as a label.
const shortName = (name: string) => name.replace(/^Seguridad\s+/i, "").replace(/^./, (letter) => letter.toUpperCase());

const response = (d: DimensionSummary) => [
  { label: "Aceptadas", value: d.accepted, color: brand.accentInk },
  { label: "Aceptadas parcialmente", value: d.partiallyAccepted, color: "#35b5e8" },
  { label: "Anotadas, sin aceptar", value: d.noted, color: "#6f7d89" },
];

// One headline finding: a figure and the dimension it refers to.
function Reading({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <Box sx={{ py: 2.5, px: { md: 3 }, borderTop: { xs: `1px solid ${brand.border}`, md: 0 }, borderLeft: { md: `1px solid ${brand.border}` }, "&:first-of-type": { pl: 0, borderLeft: 0, borderTop: 0 } }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography color="primary.main" sx={{ fontSize: "2rem", fontWeight: 500, lineHeight: 1.1, mt: .5 }}>{value}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, color: "primary.main" }}>{children}</Box>
    </Box>
  );
}

export function HumanSecurityImpact({ dimensions, total, noted }: Props) {
  const ranked = [...dimensions].sort((a, b) => b.total - a.total);
  const [selected, setSelected] = useState<DimensionCode>(ranked[0].code);
  const { setDimension } = useDimensionFilter();
  const panel = useRef<HTMLDivElement>(null);
  const active = ranked.find((d) => d.code === selected) || ranked[0];
  const byCode = Object.fromEntries(dimensions.map((d) => [d.code, d])) as Record<DimensionCode, DimensionSummary>;

  const leading = ranked[0];
  const mostNoted = [...dimensions].sort((a, b) => b.noted - a.noted)[0];
  const pair = ranked.flatMap((d) => d.overlaps.map((o) => ({ a: d, b: byCode[o.code], count: o.count }))).sort((x, y) => y.count - x.count)[0];

  const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  function select(code: DimensionCode) {
    setSelected(code);
    panel.current?.scrollIntoView({ block: "nearest", behavior: smooth() });
  }

  function showRecommendations() {
    setDimension(active.code);
    document.getElementById("recomendaciones")?.scrollIntoView({ behavior: smooth() });
  }

  const facts: [number, string][] = [
    [active.primary, "como dimensión principal"],
    [active.priority, active.priority === 1 ? "prioritaria" : "prioritarias"],
    [active.assessed, "con valoración de cumplimiento"],
    [active.monitored, "con novedades en seguimiento"],
  ];

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(3,minmax(0,1fr))" }, borderBottom: "1px solid", borderColor: "divider", mb: 3 }}>
        <Reading label="Mayor concentración" value={formatShare(leading.total, total)}>
          <DimensionIcon code={leading.code} size={22} />
          <Typography variant="body2">{leading.name} · {leading.total} recomendaciones</Typography>
        </Reading>
        {noted > 0 && (
          <Reading label="Recomendaciones anotadas" value={`${mostNoted.noted} de ${noted}`}>
            <DimensionIcon code={mostNoted.code} size={22} />
            <Typography variant="body2">afectan a la {mostNoted.name.toLowerCase()}</Typography>
          </Reading>
        )}
        {pair && (
          <Reading label="Cruce más frecuente" value={formatShare(pair.count, total)}>
            <DimensionIcon code={pair.a.code} size={22} />
            <DimensionIcon code={pair.b.code} size={22} />
            <Typography variant="body2">{pair.count} afectan a la vez a la seguridad {shortName(pair.a.name).toLowerCase()} y {shortName(pair.b.name).toLowerCase()}</Typography>
          </Reading>
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: 1.5 }}>
        {ranked.map((d) => {
          const on = d.code === active.code;
          return (
            <Box
              key={d.code}
              component="button"
              type="button"
              aria-pressed={on}
              onClick={() => select(d.code)}
              sx={{
                appearance: "none", font: "inherit", textAlign: "left", cursor: "pointer", minWidth: 0,
                p: { xs: 1.75, md: 2.25 }, border: "1px solid", borderColor: on ? "primary.main" : "divider",
                bgcolor: on ? "primary.main" : "#fff", color: on ? "#fff" : "primary.main",
                transition: "background-color .15s, border-color .15s, color .15s",
                "&:hover": { borderColor: on ? "primary.main" : brand.accentInk, bgcolor: on ? "primary.main" : brand.accentSoft },
                "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 3 },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                <DimensionIcon code={d.code} size={44} />
                <Typography component="span" sx={{ fontSize: { xs: "1.9rem", md: "2.3rem" }, fontWeight: 500, lineHeight: 1 }}>{d.total}</Typography>
              </Box>
              <Typography component="span" variant="overline" sx={{ display: "block", mt: 2, lineHeight: 1.4, color: on ? "rgba(255,255,255,.72)" : "text.secondary" }}>Seguridad</Typography>
              <Typography component="span" sx={{ display: "block", fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.3 }}>{shortName(d.name)}</Typography>
              <Box sx={{ height: 4, mt: 1.75, bgcolor: on ? "rgba(255,255,255,.2)" : "rgba(0,163,224,.16)" }}>
                <Box sx={{ height: 1, width: `${total ? (100 * d.total) / total : 0}%`, bgcolor: on ? "secondary.main" : brand.accentInk }} />
              </Box>
              <Typography component="span" variant="caption" sx={{ display: "block", mt: .9, color: on ? "rgba(255,255,255,.72)" : "text.secondary" }}>{formatShare(d.total, total)} del examen</Typography>
            </Box>
          );
        })}
      </Box>

      <Box ref={panel} role="region" aria-live="polite" aria-label={`Análisis de la ${active.name.toLowerCase()}`} sx={{ mt: 1.5, p: { xs: 2.25, md: 4 }, bgcolor: brand.soft, borderTop: `2px solid ${brand.accent}`, scrollMarginBlock: 96 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,4fr) minmax(0,4fr) minmax(0,4fr)" }, columnGap: 6, rowGap: 4 }}>
          <Box sx={{ color: "primary.main" }}>
            <DimensionIcon code={active.code} size={72} />
            <Typography variant="h3" sx={{ fontSize: "1.6rem", mt: 2 }}>{active.name}</Typography>
            {active.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.65 }}>{active.description}</Typography>}
            <Button variant="contained" color="primary" endIcon={<ArrowDownwardRoundedIcon />} onClick={showRecommendations} disabled={!active.total} sx={{ mt: 2.5 }}>
              {active.total === 1 ? "Ver la recomendación" : `Ver las ${active.total} recomendaciones`}
            </Button>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">Respuesta de España</Typography>
            <Box role="img" aria-label={response(active).map((r) => `${r.label}: ${r.value}`).join(". ")} sx={{ display: "flex", gap: "2px", height: 12, mt: 1.25 }}>
              {response(active).filter((r) => r.value > 0).map((r) => (
                <Box key={r.label} title={`${r.label}: ${r.value} (${formatShare(r.value, active.total)})`} sx={{ flex: `${r.value} 0 0`, minWidth: 5, bgcolor: r.color }} />
              ))}
            </Box>
            <Box sx={{ mt: 1.5 }}>
              {response(active).map((r) => (
                <Box key={r.label} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: .6 }}>
                  <Box aria-hidden sx={{ width: 10, height: 10, bgcolor: r.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{r.label}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatShare(r.value, active.total)}</Typography>
                  <Typography variant="body2" color="primary.main" sx={{ width: 34, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.value}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 3, rowGap: 2, mt: 2.5, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
              {facts.map(([value, label]) => (
                <Box key={label}>
                  <Typography color="primary.main" sx={{ fontSize: "1.5rem", fontWeight: 500, lineHeight: 1 }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">Recomendaciones compartidas con</Typography>
            <Box sx={{ mt: .75 }}>
              {active.overlaps.map((o) => (
                <Box key={o.code} sx={{ display: "grid", gridTemplateColumns: "20px minmax(0,1fr) 34px", alignItems: "center", columnGap: 1.25, py: .7, color: "primary.main" }}>
                  <DimensionIcon code={o.code} size={20} />
                  <Box>
                    <Typography variant="body2" color="text.primary">{byCode[o.code].name}</Typography>
                    <Box title={`${formatShare(o.count, active.total)} de la ${active.name.toLowerCase()}`} sx={{ height: 4, mt: .5, bgcolor: "rgba(0,163,224,.16)" }}>
                      <Box sx={{ height: 1, width: `${(100 * o.count) / active.total}%`, bgcolor: brand.accentInk }} />
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{o.count}</Typography>
                </Box>
              ))}
              {!active.overlaps.length && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Sin recomendaciones compartidas con otras dimensiones.</Typography>}
            </Box>
          </Box>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Una recomendación puede afectar a varias dimensiones, por lo que los porcentajes no suman 100. Siete dimensiones proceden del marco de seguridad humana del PNUD; la seguridad tecnológica es una dimensión añadida por Blue Human.
      </Typography>
    </Box>
  );
}
