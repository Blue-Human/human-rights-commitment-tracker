"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import type { DimensionCode } from "@/lib/hrct";
import { brand } from "@/theme";
import { useDimensionFilter } from "./DimensionFilter";
import { DimensionIcon } from "./DimensionIcon";

type Dimension = { code: DimensionCode; name: string; total: number };
type Goal = { number: number; name: string; color: string; total: number };
type Pair = { code: DimensionCode; goal: number; count: number };

type Props = {
  // Dimensions and goals that share at least one recommendation, each with all of its recommendations.
  dimensions: Dimension[];
  goals: Goal[];
  // Recommendations that share a dimension and a goal.
  pairs: Pair[];
  // Recommendations with both a dimension and a goal.
  both: number;
};

type Active = { dimension?: DimensionCode; goal?: number } | null;

// Height the diagram is laid out for, the least height of a row (it holds a two-line label) and the
// least gap between rows. The section that holds the diagram may draw it shorter (--crossing-height):
// rows, bars and bands are placed as shares of the height, so they keep their proportions.
const HEIGHT = 456;
const height = `var(--crossing-height, ${HEIGHT}px)`;
const share = (part: number, whole: number) => `${(100 * part) / whole}%`;
const ROW = 30;
const GAP = 4;

const quiet = "rgba(255,255,255,.72)";
const hairline = "rgba(255,255,255,.16)";

const plural = (n: number) => `${n} ${n === 1 ? "recomendación" : "recomendaciones"}`;
// "Seguridad comunitaria" → "Comunitaria": the column is headed "Seguridad humana".
const shortName = (name: string) => name.replace(/^Seguridad\s+/i, "").replace(/^./, (letter) => letter.toUpperCase());
const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}` : items[0]);

const reveal = keyframes({ from: { clipPath: "inset(0 100% 0 0)" }, to: { clipPath: "inset(0 0 0 0)" } });

// Rows of one side: each as tall as its recommendations in common with the other side, and never
// shorter than its label. The rows are spread over the whole height.
function rows(values: number[], scale: number) {
  const heights = values.map((value) => Math.max(value * scale, ROW));
  const gap = values.length > 1 ? (HEIGHT - heights.reduce((sum, height) => sum + height, 0)) / (values.length - 1) : 0;
  let y = 0;
  return values.map((value, index) => {
    const bar = Math.max(value * scale, 2);
    const row = { height: heights[index], bar, barTop: y + (heights[index] - bar) / 2 };
    y += heights[index] + gap;
    return row;
  });
}

function layout(dimensions: Dimension[], goals: Goal[], pairs: Pair[]) {
  const shared = (test: (pair: Pair) => boolean) => pairs.filter(test).reduce((sum, pair) => sum + pair.count, 0);
  const left = dimensions.map((d) => shared((pair) => pair.code === d.code));
  const right = goals.map((g) => shared((pair) => pair.goal === g.number));
  // The largest scale (pixels per recommendation) at which both sides fit in the height.
  const fits = (values: number[], scale: number) => values.reduce((sum, value) => sum + Math.max(value * scale, ROW), 0) + GAP * (values.length - 1) <= HEIGHT;
  let low = 0, high = HEIGHT / Math.max(1, ...left, ...right);
  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2;
    if (fits(left, middle) && fits(right, middle)) low = middle;
    else high = middle;
  }
  const leftRows = rows(left, low), rightRows = rows(right, low);
  // Within a row the bands are stacked in the order of the rows they lead to, so that they cross as little as possible.
  const leftAt = leftRows.map((row) => row.barTop), rightAt = rightRows.map((row) => row.barTop);
  const bands = [...pairs]
    .sort((a, b) => dimensions.findIndex((d) => d.code === a.code) - dimensions.findIndex((d) => d.code === b.code) || a.goal - b.goal)
    .map((pair) => {
      const l = dimensions.findIndex((d) => d.code === pair.code), r = goals.findIndex((g) => g.number === pair.goal);
      const width = pair.count * low;
      return { pair, l, r, width, y0: 0, y1: 0 };
    });
  for (const band of bands) { band.y0 = leftAt[band.l]; leftAt[band.l] += band.width; }
  for (const band of [...bands].sort((a, b) => a.r - b.r || a.l - b.l)) { band.y1 = rightAt[band.r]; rightAt[band.r] += band.width; }
  return { leftRows, rightRows, bands };
}

// The diagram is drawn 100 units wide and stretched to its column: only the heights are in pixels.
function path(y0: number, y1: number, width: number) {
  const w = Math.max(width, 1);
  return `M0,${y0}C50,${y0} 50,${y1} 100,${y1}L100,${y1 + w}C50,${y1 + w} 50,${y0 + w} 0,${y0 + w}Z`;
}

const rowButton = {
  appearance: "none", font: "inherit", color: "inherit", bgcolor: "transparent", border: 0, p: 0, m: 0,
  display: "flex", alignItems: "center", width: "100%", height: "100%", cursor: "pointer", textAlign: "left",
  transition: "opacity .15s",
  "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
} as const;

// Human-security dimensions on one side, Sustainable Development Goals on the other, and between
// them one band per pair, as thick as the recommendations the two have in common.
export function FrameworkCrossing({ dimensions, goals, pairs, both }: Props) {
  const [hovered, setHovered] = useState<Active>(null);
  const [pinned, setPinned] = useState<Active>(null);
  const { setDimension } = useDimensionFilter();
  const id = useId();
  const { leftRows, rightRows, bands } = useMemo(() => layout(dimensions, goals, pairs), [dimensions, goals, pairs]);

  const active = hovered ?? pinned;
  const dimension = dimensions.find((d) => d.code === active?.dimension);
  const goal = goals.find((g) => g.number === active?.goal);
  const count = (code: DimensionCode, number: number) => pairs.find((pair) => pair.code === code && pair.goal === number)?.count || 0;
  const on = (pair: Pair) => (!dimension || pair.code === dimension.code) && (!goal || pair.goal === goal.number);
  const toggle = (next: NonNullable<Active>) => setPinned(pinned && pinned.dimension === next.dimension && pinned.goal === next.goal ? null : next);

  function showRecommendations(code: DimensionCode) {
    setDimension(code);
    document.getElementById("recomendaciones")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  let heading = "Seguridad humana y Agenda 2030";
  let reading = `${plural(both)} ${both === 1 ? "tiene" : "tienen"} a la vez una dimensión de seguridad humana y un ODS.`;
  if (dimension && goal) {
    heading = plural(count(dimension.code, goal.number));
    reading = `${count(dimension.code, goal.number) === 1 ? "comparte" : "comparten"} la ${dimension.name.toLowerCase()} y el ODS ${goal.number}, «${goal.name}».`;
  } else if (dimension) {
    const top = pairs.filter((pair) => pair.code === dimension.code).slice(0, 2);
    heading = `${dimension.name} · ${plural(dimension.total)}`;
    reading = `Se cruza sobre todo con ${list(top.map((pair) => `el ODS ${pair.goal} (${pair.count})`))}.`;
  } else if (goal) {
    const top = pairs.filter((pair) => pair.goal === goal.number).slice(0, 2);
    heading = `ODS ${goal.number} · ${goal.name} · ${plural(goal.total)}`;
    reading = `Se cruza sobre todo con ${list(top.map((pair) => `la ${dimensions.find((d) => d.code === pair.code)!.name.toLowerCase()} (${pair.count})`))}.`;
  }

  const link = { color: "#fff", textDecorationColor: brand.accent, textUnderlineOffset: "4px", "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 } };
  const head = { color: quiet, pb: 1.25, lineHeight: 1.4 } as const;

  return (
    <Box component="figure" role="group" aria-label="Cruce entre las dimensiones de la seguridad humana y los Objetivos de Desarrollo Sostenible" onMouseLeave={() => setHovered(null)} sx={{ m: 0, minWidth: 0 }}>
      {/* Room for two lines of reading, so that the diagram does not move as the reading changes. */}
      <Box aria-live="polite" sx={{ minHeight: { xs: "6.4rem", sm: "var(--crossing-reading, 4.4rem)" } }}>
        <Typography sx={{ fontSize: "1.15rem", fontWeight: 500, lineHeight: 1.35 }}>{heading}</Typography>
        <Typography variant="body2" sx={{ mt: .5, color: quiet, lineHeight: 1.55 }}>
          {reading}
          {dimension && !goal && <> <Box component="a" href="#recomendaciones" onClick={(event) => { event.preventDefault(); showRecommendations(dimension.code); }} sx={link}>Ver sus recomendaciones</Box></>}
          {goal && !dimension && <> <Box component={Link} href={`/ods/${goal.number}`} sx={link}>Ver el objetivo</Box></>}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gridTemplateRows: `auto ${height}`, mt: { xs: 1.5, lg: 1 }, pt: 1.5, borderTop: `1px solid ${hairline}` }}>
        <Typography variant="overline" sx={{ ...head, textAlign: "right" }}>Seguridad humana</Typography>
        <span />
        <Typography variant="overline" sx={head}><Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Objetivos de Desarrollo Sostenible</Box><Box component="span" sx={{ display: { sm: "none" } }}>ODS</Box></Typography>

        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, height, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {dimensions.map((d, index) => {
            const shared = goal ? count(d.code, goal.number) : null;
            const dim = (dimension && dimension.code !== d.code) || shared === 0;
            return (
              <Box component="li" key={d.code} sx={{ height: share(leftRows[index].height, HEIGHT) }}>
                <Box
                  component="button"
                  type="button"
                  aria-pressed={pinned?.dimension === d.code && !pinned.goal}
                  aria-label={`${d.name}: ${plural(d.total)}`}
                  onClick={() => toggle({ dimension: d.code })}
                  onMouseEnter={() => setHovered({ dimension: d.code })}
                  onFocus={() => setHovered({ dimension: d.code })}
                  onBlur={() => setHovered(null)}
                  sx={{ ...rowButton, justifyContent: "flex-end", gap: { xs: .75, sm: 1 }, opacity: dim ? .38 : 1 }}
                >
                  <Typography component="span" variant="body2" sx={{ minWidth: "3ch", textAlign: "right", fontVariantNumeric: "tabular-nums", color: shared ? "#fff" : quiet, fontWeight: shared ? 600 : 400 }}>{shared === 0 ? "·" : shared ?? d.total}</Typography>
                  <Typography component="span" variant="body2" sx={{ fontWeight: 500, fontSize: { xs: ".8rem", sm: ".875rem" } }}>{shortName(d.name)}</Typography>
                  <DimensionIcon code={d.code} size={18} />
                  <Box component="span" aria-hidden sx={{ width: 6, height: share(leftRows[index].bar, leftRows[index].height), bgcolor: "#fff", flexShrink: 0 }} />
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box component="svg" aria-hidden viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" sx={{ display: "block", width: "100%", height, animation: `${reveal} .9s cubic-bezier(.2,.7,.2,1) both`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}>
          {/* Each band runs from the brand colour to the official colour of its goal. */}
          <defs>
            {goals.map((g) => (
              <linearGradient key={g.number} id={`${id}-goal-${g.number}`} gradientUnits="userSpaceOnUse" x1="0" x2="100" y1="0" y2="0">
                <stop offset="0" stopColor={brand.accent} />
                <stop offset=".35" stopColor={brand.accent} />
                <stop offset="1" stopColor={g.color} />
              </linearGradient>
            ))}
          </defs>
          {bands.map(({ pair, y0, y1, width }) => (
            <Box
              component="path"
              key={`${pair.code}-${pair.goal}`}
              d={path(y0, y1, width)}
              onMouseEnter={() => setHovered({ dimension: pair.code, goal: pair.goal })}
              fill={`url(#${id}-goal-${pair.goal})`}
              sx={{ fillOpacity: active ? (on(pair) ? .95 : .07) : .5, transition: "fill-opacity .15s", cursor: "default" }}
            />
          ))}
        </Box>

        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, height, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {goals.map((g, index) => {
            const shared = dimension ? count(dimension.code, g.number) : null;
            const dim = (goal && goal.number !== g.number) || shared === 0;
            return (
              <Box component="li" key={g.number} sx={{ height: share(rightRows[index].height, HEIGHT) }}>
                <Box
                  component="button"
                  type="button"
                  aria-pressed={pinned?.goal === g.number && !pinned.dimension}
                  aria-label={`ODS ${g.number}, ${g.name}: ${plural(g.total)}`}
                  onClick={() => toggle({ goal: g.number })}
                  onMouseEnter={() => setHovered({ goal: g.number })}
                  onFocus={() => setHovered({ goal: g.number })}
                  onBlur={() => setHovered(null)}
                  sx={{ ...rowButton, gap: { xs: .75, sm: 1 }, opacity: dim ? .38 : 1 }}
                >
                  {/* The goal's official colour, as a mark beside its number and name. */}
                  <Box component="span" aria-hidden sx={{ width: 6, height: share(rightRows[index].bar, rightRows[index].height), bgcolor: g.color, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.3)" }} />
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: { sm: "2ch" }, textAlign: { sm: "right" }, whiteSpace: "nowrap" }}><Box component="span" sx={{ display: { sm: "none" }, fontWeight: 500 }}>ODS </Box>{g.number}</Typography>
                  <Typography component="span" sx={{ display: { xs: "none", sm: "block" }, width: 138, fontSize: ".72rem", lineHeight: 1.25, color: "rgba(255,255,255,.86)" }}>{g.name}</Typography>
                  <Typography component="span" variant="body2" sx={{ ml: "auto", minWidth: "3ch", textAlign: "right", fontVariantNumeric: "tabular-nums", color: shared ? "#fff" : quiet, fontWeight: shared ? 600 : 400 }}>{shared === 0 ? "·" : shared ?? g.total}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Typography component="figcaption" variant="caption" sx={{ display: "block", mt: { xs: 2, lg: 1.5 }, color: quiet, lineHeight: 1.6 }}>
        Cada banda une una dimensión y un objetivo; su grosor es el número de recomendaciones que comparten. Una recomendación puede figurar en varias bandas. Clasificación de HRCT a partir del texto oficial. <Box component={Link} href="/ods#cruce" sx={link}>Ver la tabla completa</Box>
      </Typography>
    </Box>
  );
}
