"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { brand } from "@/brand";
import { formatShare, type DimensionCode } from "@/lib/hrct";
import { DimensionIcon } from "./DimensionIcon";
import { SdgIcon } from "./SdgIcon";

export type SdgExplorerGoal = {
  number: number;
  name: string;
  // Official statement of the goal.
  title: string;
  color: string;
  // Recommendations related to the goal, and how Spain responded to them.
  total: number;
  accepted: number;
  partiallyAccepted: number;
  noted: number;
  priority: number;
  assessed: number;
  targetCount: number;
  linkedTargets: number;
  // Most related targets and human-security dimensions, most frequent first.
  targets: { code: string; text: string; count: number }[];
  dimensions: { code: DimensionCode; name: string; count: number }[];
};

const track = "rgba(0,163,224,.16)";
const plural = (n: number) => (n === 1 ? "recomendación" : "recomendaciones");

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <Box aria-hidden sx={{ height: 4, bgcolor: track }}>
      <Box sx={{ height: 1, width: `${max ? (100 * value) / max : 0}%`, bgcolor: brand.accentInk }} />
    </Box>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Typography variant="overline" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>{children}</Typography>;
}

// The 17 goals as a wall of official icons; the selected one shows how the recommendations relate to it.
export function SdgExplorer({ goals, total }: { goals: SdgExplorerGoal[]; total: number }) {
  const max = Math.max(...goals.map((g) => g.total));
  const [selected, setSelected] = useState(() => [...goals].sort((a, b) => b.total - a.total)[0].number);
  const panel = useRef<HTMLDivElement>(null);
  const active = goals.find((g) => g.number === selected) || goals[0];

  function select(number: number) {
    setSelected(number);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }

  const response = [
    { label: "Aceptadas", value: active.accepted, color: brand.accentInk },
    { label: "Aceptadas parcialmente", value: active.partiallyAccepted, color: "#35b5e8" },
    { label: "Anotadas, sin aceptar", value: active.noted, color: "#6f7d89" },
  ];
  const facts: [string, string][] = [
    [String(active.priority), active.priority === 1 ? "prioritaria" : "prioritarias"],
    [String(active.assessed), "con valoración"],
    [`${active.linkedTargets}/${active.targetCount}`, "metas relacionadas"],
  ];

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3,minmax(0,1fr))", sm: "repeat(4,minmax(0,1fr))", md: "repeat(6,minmax(0,1fr))" }, columnGap: { xs: 1.5, md: 3 }, rowGap: { xs: 2.5, md: 3.5 } }}>
        {goals.map((goal, index) => {
          const on = goal.number === active.number;
          return (
            <Box
              key={goal.number}
              component="button"
              type="button"
              aria-pressed={on}
              onClick={() => select(goal.number)}
              sx={{
                position: "relative", appearance: "none", font: "inherit", textAlign: "left", cursor: "pointer", minWidth: 0, p: 0, border: 0, bgcolor: "transparent",
                "&:hover .sdg-count": { color: on ? "#fff" : brand.accentInk },
                "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 4 },
              }}
            >
              <SdgIcon goal={goal} sizes="(min-width: 1200px) 180px, (min-width: 900px) 16vw, (min-width: 600px) 23vw, 30vw" priority={index < 6} />
              {/* The selected goal is marked on its figure, never on the icon. */}
              <Box sx={{ display: "flex", mt: .5, px: 1 }}>
                <Typography className="sdg-count" component="span" sx={{ px: on ? .9 : 0, py: .35, fontSize: "1.3rem", fontWeight: 500, lineHeight: 1, bgcolor: on ? "primary.main" : "transparent", color: on ? "#fff" : goal.total ? "primary.main" : "text.secondary", fontVariantNumeric: "tabular-nums", transition: "color .15s, background-color .15s, padding .15s" }}>{goal.total}</Typography>
                <Box component="span" sx={visuallyHidden}>{plural(goal.total)}</Box>
              </Box>
              <Box sx={{ mt: .75, px: 1 }}><Bar value={goal.total} max={max} /></Box>
            </Box>
          );
        })}
      </Box>

      <Box ref={panel} role="region" aria-live="polite" aria-label={`ODS ${active.number}: ${active.name}`} sx={{ mt: 1, p: { xs: 2.25, md: 4 }, bgcolor: brand.soft, borderTop: `3px solid ${active.color}`, scrollMarginBlock: 96 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))", lg: "minmax(0,10fr) minmax(0,9fr) minmax(0,10fr) minmax(0,9fr)" }, columnGap: 5, rowGap: 4 }}>
          <Box>
            <Box sx={{ width: 148 }}>
              <SdgIcon goal={active} variant="filled" sizes="148px" />
            </Box>
            <Typography sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 2.5, color: "primary.main" }}>
              <Box component="span" sx={{ fontSize: "2.6rem", fontWeight: 500, lineHeight: 1, letterSpacing: "-.02em" }}>{active.total}</Box>
              <Box component="span" sx={{ fontWeight: 500 }}>{plural(active.total)}</Box>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
              {active.total ? `${formatShare(active.total, total)} del examen` : "Ninguna recomendación del examen se relaciona con este objetivo"}
            </Typography>
            <Button component={Link} href={`/ods/${active.number}`} variant="contained" color="primary" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 2.5 }}>
              {active.total ? "Ver objetivo y recomendaciones" : "Ver objetivo y metas"}
            </Button>
          </Box>

          {active.total > 0 && (
            <>
              <Box>
                <Label>Respuesta de España</Label>
                <Box role="img" aria-label={response.map((r) => `${r.label}: ${r.value}`).join(". ")} sx={{ display: "flex", gap: "2px", height: 12, mt: 1.25 }}>
                  {response.filter((r) => r.value > 0).map((r) => (
                    <Box key={r.label} title={`${r.label}: ${r.value} (${formatShare(r.value, active.total)})`} sx={{ flex: `${r.value} 0 0`, minWidth: 5, bgcolor: r.color }} />
                  ))}
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  {response.map((r) => (
                    <Box key={r.label} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: .6 }}>
                      <Box aria-hidden sx={{ width: 10, height: 10, bgcolor: r.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{r.label}</Typography>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", columnGap: 2, mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                  {facts.map(([value, label]) => (
                    <Box key={label}>
                      <Typography color="primary.main" sx={{ fontSize: "1.35rem", fontWeight: 500, lineHeight: 1 }}>{value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5, lineHeight: 1.3 }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box>
                <Label>Metas más relacionadas</Label>
                <Box sx={{ mt: .75 }}>
                  {active.targets.map((target) => (
                    <Box key={target.code} component={Link} href={`/ods/${active.number}#meta-${target.code}`} title={target.text} sx={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr) 30px", alignItems: "center", columnGap: 1.25, py: .9, color: "primary.main", textDecoration: "none", "&:hover .sdg-target": { color: brand.accentInk }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
                      <Typography className="sdg-target" component="span" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", transition: "color .15s" }}>{target.code}</Typography>
                      <Box>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35, mb: .6 }}>{target.text}</Typography>
                        <Bar value={target.count} max={active.total} />
                      </Box>
                      <Typography component="span" variant="body2" sx={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{target.count}</Typography>
                    </Box>
                  ))}
                  {!active.targets.length && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>La fuente no las relaciona con ninguna meta concreta.</Typography>}
                </Box>
              </Box>

              <Box>
                <Label>Seguridad humana afectada</Label>
                <Box sx={{ mt: .75 }}>
                  {active.dimensions.map((dimension) => (
                    <Box key={dimension.code} sx={{ display: "grid", gridTemplateColumns: "20px minmax(0,1fr) 30px", alignItems: "center", columnGap: 1.25, py: .7, color: "primary.main" }}>
                      <DimensionIcon code={dimension.code} size={20} />
                      <Box>
                        <Typography variant="body2" color="text.primary" sx={{ mb: .5 }}>{dimension.name}</Typography>
                        <Bar value={dimension.count} max={active.total} />
                      </Box>
                      <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{dimension.count}</Typography>
                    </Box>
                  ))}
                  {!active.dimensions.length && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Sin datos de seguridad humana.</Typography>}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
