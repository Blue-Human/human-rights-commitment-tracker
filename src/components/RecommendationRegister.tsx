"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, FormControl, InputAdornment, InputLabel, MenuItem, Pagination, Paper, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { brand } from "@/brand";
import { acceptanceLabels, dimensionCodes, dimensionNames, statusLabels, type DimensionCode } from "@/lib/hrct";
import { sdgIcon, sdgIconSize } from "@/lib/sdg-icon";
import { DimensionIcon } from "./DimensionIcon";
import { PriorityTag } from "./PriorityTag";
import { StatusChip } from "./StatusChip";

// A recommendation as the register lists it. `text` is the official text when the row shows a
// summary instead, so that the search still reads it.
export type RegisterItem = {
  public_id: string;
  number: string;
  title: string;
  summary: string;
  text?: string;
  status: string | null;
  acceptance: string | null;
  provisional: boolean;
  priority: boolean;
  dimensions: DimensionCode[];
  goals: number[];
  developments: number;
};

// The state of the register, as it is written in the address of the page.
type RegisterFilters = { query: string; acceptance: string; status: string; dimension: string; goal: string; priority: boolean; page: number };
const NO_FILTERS: RegisterFilters = { query: "", acceptance: "all", status: "all", dimension: "all", goal: "all", priority: false, page: 1 };

type Props = {
  items: RegisterItem[];
  // Number and name of each goal that has recommendations.
  goals: { number: number; name: string }[];
};

// The filters written in the address. A value the register does not know is ignored.
function readFilters(params: URLSearchParams, goals: Props["goals"]): RegisterFilters {
  const among = (key: string, known: readonly string[]) => (known.includes(params.get(key) || "") ? params.get(key)! : "all");
  return {
    query: (params.get("q") || "").slice(0, 120),
    acceptance: among("respuesta", Object.keys(acceptanceLabels)),
    status: among("estado", Object.keys(statusLabels)),
    dimension: among("seguridad", dimensionCodes),
    goal: among("ods", goals.map((g) => String(g.number))),
    priority: params.get("prioritarias") === "1",
    page: Math.max(1, Math.floor(Number(params.get("pagina"))) || 1),
  };
}

const PAGE_SIZE = 20;
const statusOrder = ["not_assessed", "implemented", "substantially_implemented", "in_progress", "limited_progress", "not_implemented", "regressed", "unable_to_assess"];
const tabs: [string, string][] = [["all", "Todas"], ["accepted", "Aceptadas"], ["partially_accepted", "Aceptadas parcialmente"], ["noted", "Anotadas"]];
const plural = (n: number) => `${n} ${n === 1 ? "recomendación" : "recomendaciones"}`;

// The classification of a recommendation, as marks beside it: the pictograms of its human-security
// dimensions and the official icons of its goals. No text; each mark names itself on hover and to a screen reader.
function Classification({ item, goalNames }: { item: RegisterItem; goalNames: Record<number, string> }) {
  if (!item.dimensions.length && !item.goals.length) return null;
  return (
    <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: { xs: "row", md: "column" }, flexWrap: "wrap", alignItems: { xs: "center", md: "flex-end" }, columnGap: 2, rowGap: 1.25, pointerEvents: { xs: "none", md: "auto" } }}>
      {item.dimensions.length > 0 && (
        <Box component="ul" aria-label="Seguridad humana" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", gap: 1, color: brand.muted }}>
          {item.dimensions.map((code) => (
            <Box component="li" key={code} sx={{ display: "flex" }}>
              <Tooltip title={dimensionNames[code]} arrow disableInteractive>
                <Box component="span" role="img" aria-label={dimensionNames[code]} sx={{ display: "flex", transition: "color .15s", "&:hover": { color: brand.navy } }}>
                  <DimensionIcon code={code} size={18} />
                </Box>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}
      {item.goals.length > 0 && (
        <Box component="ul" aria-label="Objetivos de Desarrollo Sostenible" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", justifyContent: { md: "flex-end" }, gap: .5 }}>
          {item.goals.map((goal) => (
            <Box component="li" key={goal} sx={{ display: "flex" }}>
              <Tooltip title={`ODS ${goal} · ${goalNames[goal]}`} arrow disableInteractive>
                {/* The official icon, whole and unaltered, served as published. */}
                <Image src={sdgIcon(goal, "filled")} alt={`ODS ${goal}: ${goalNames[goal]}`} width={sdgIconSize.filled} height={sdgIconSize.filled} sizes="28px" unoptimized style={{ display: "block", width: 28, height: 28 }} />
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// The full catalogue of recommendations: tabs by the State's response, filters by compliance,
// human security and goal, and numbered pages. Its state lives in the address, so a filtered
// view can be shared and is still there on the way back from a record: the state starts from the
// address the router holds, which is the one the reader left.
export function RecommendationRegister({ items, goals }: Props) {
  const address = useSearchParams();
  const [filters, setFilters] = useState(() => readFilters(address, goals));
  const { query, acceptance, status, dimension, goal, priority, page } = filters;
  // Any change of filter goes back to the first page.
  const set = (change: Partial<RegisterFilters>) => setFilters((now) => ({ ...now, page: 1, ...change }));
  // On a phone the selects fold away; until the reader decides, they show whenever one is in use.
  const [filtersOpen, setFiltersOpen] = useState<boolean | null>(null);
  const id = useId();
  const top = useRef<HTMLDivElement>(null);
  const goalNames = useMemo(() => Object.fromEntries(goals.map((g) => [g.number, g.name])), [goals]);
  const dimensions = useMemo(() => dimensionCodes.filter((code) => items.some((item) => item.dimensions.includes(code))), [items]);
  const priorityCount = useMemo(() => items.filter((item) => item.priority).length, [items]);

  // Priorities come first; within each group the order of the official report is kept.
  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase();
    // A recommendation number is matched whole: "50.10" is not "50.100".
    const number = /^\d+\.\d+$/.test(words);
    return items.filter((item) =>
      (!words || (number ? item.number === words : `${item.public_id} ${item.number} ${item.title} ${item.summary} ${item.text ?? ""}`.toLowerCase().includes(words)))
      && (status === "all" || (item.status || "not_assessed") === status)
      && (dimension === "all" || item.dimensions.includes(dimension as DimensionCode))
      && (goal === "all" || item.goals.includes(Number(goal)))
      && (!priority || item.priority),
    ).sort((a, b) => Number(b.priority) - Number(a.priority));
  }, [items, query, status, dimension, goal, priority]);
  const visible = acceptance === "all" ? filtered : filtered.filter((item) => item.acceptance === acceptance);
  const count = (tab: string) => (tab === "all" ? filtered.length : filtered.filter((item) => item.acceptance === tab).length);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const at = Math.min(page, pages);
  const rows = visible.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE);
  const selects = [status, dimension, goal].filter((value) => value !== "all").length;
  const filtersShown = filtersOpen ?? selects > 0;
  const anyFilter = selects > 0 || !!query || priority || acceptance !== "all";

  // The address follows the state, without adding entries to the history. Nothing is written when the
  // page opens: the router has not taken over the history yet, and a write then would erase the entry
  // it needs to come back to this page.
  const written = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (acceptance !== "all") params.set("respuesta", acceptance);
    if (status !== "all") params.set("estado", status);
    if (dimension !== "all") params.set("seguridad", dimension);
    if (goal !== "all") params.set("ods", goal);
    if (priority) params.set("prioritarias", "1");
    if (at > 1) params.set("pagina", String(at));
    const search = params.toString();
    const first = written.current === null;
    if (first || search === written.current) { written.current = search; return; }
    written.current = search;
    // Some browsers refuse to rewrite the address many times in a few seconds; the list does not depend on it.
    try { window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`); } catch { /* the address keeps its last value */ }
  }, [query, acceptance, status, dimension, goal, priority, at]);

  // An address that changes from outside (the link in the header, for instance) sets the state again.
  const seen = useRef(address.toString());
  useEffect(() => {
    const now = address.toString();
    if (now === seen.current) return;
    seen.current = now;
    if (now !== written.current) setFilters(readFilters(address, goals));
  }, [address, goals]);

  function goTo(next: number) {
    setFilters((now) => ({ ...now, page: next }));
    top.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  return (
    <Stack ref={top} spacing={2.5} sx={{ scrollMarginTop: { xs: 72, md: 88 } }}>
      <Tabs value={acceptance} onChange={(_, value: string) => set({ acceptance: value })} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Respuesta de España">
        {tabs.map(([tab, label]) => (
          <Tab
            key={tab}
            value={tab}
            id={`${id}-tab-${tab}`}
            aria-controls={`${id}-panel`}
            label={<Box component="span">{label}<Box component="span" sx={{ ml: 1, color: "text.secondary", fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>{count(tab)}</Box></Box>}
          />
        ))}
      </Tabs>

      <Paper variant="outlined" square sx={{ p: { xs: 2, md: 2.25 }, bgcolor: "#fff" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} useFlexGap>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => set({ query: e.target.value })}
            // "Go" on a phone keyboard puts the keyboard away: the list filters as the reader types.
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLElement).blur(); }}
            placeholder="Buscar por número o palabra clave"
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
              htmlInput: { "aria-label": "Buscar por número de recomendación o palabra clave", inputMode: "search", enterKeyHint: "search", autoCapitalize: "none", autoCorrect: "off", sx: { textOverflow: "ellipsis" } },
            }}
          />
          <Button
            variant="outlined"
            color="primary"
            aria-expanded={filtersShown}
            aria-controls={`${id}-filters`}
            onClick={() => setFiltersOpen(!filtersShown)}
            endIcon={<ExpandMoreRoundedIcon sx={{ transform: filtersShown ? "rotate(180deg)" : "none" }} />}
            sx={{ display: { md: "none" }, justifyContent: "space-between" }}
          >
            {selects ? `Filtros · ${selects} ${selects === 1 ? "activo" : "activos"}` : "Filtros"}
          </Button>
          <Box id={`${id}-filters`} sx={{ display: { xs: filtersShown ? "contents" : "none", md: "contents" } }}>
            <FormControl sx={{ minWidth: { xs: "100%", md: 190 } }}>
              <InputLabel id={`${id}-status`}>Cumplimiento</InputLabel>
              <Select labelId={`${id}-status`} label="Cumplimiento" value={status} onChange={(e) => set({ status: e.target.value })}>
                <MenuItem value="all">Todos los estados</MenuItem>
                {statusOrder.map((code) => <MenuItem key={code} value={code}>{statusLabels[code]}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: { xs: "100%", md: 205 } }}>
              <InputLabel id={`${id}-dimension`}>Seguridad humana</InputLabel>
              <Select labelId={`${id}-dimension`} label="Seguridad humana" value={dimension} onChange={(e) => set({ dimension: e.target.value })}>
                <MenuItem value="all">Todas las dimensiones</MenuItem>
                {dimensions.map((code) => <MenuItem key={code} value={code}>{dimensionNames[code]}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: { xs: "100%", md: 190 } }}>
              <InputLabel id={`${id}-goal`}>ODS</InputLabel>
              <Select labelId={`${id}-goal`} label="ODS" value={goal} onChange={(e) => set({ goal: e.target.value })} renderValue={(value) => (value === "all" ? "Todos los objetivos" : `ODS ${value}`)}>
                <MenuItem value="all">Todos los objetivos</MenuItem>
                {goals.map((g) => <MenuItem key={g.number} value={String(g.number)}>{g.number} · {g.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" color="text.secondary" aria-live="polite">{plural(visible.length)}</Typography>
          {priorityCount > 0 && (
            <Button size="small" variant={priority ? "contained" : "outlined"} aria-pressed={priority} onClick={() => set({ priority: !priority })}>
              Solo prioritarias ({priorityCount})
            </Button>
          )}
          {anyFilter && <Button size="small" onClick={() => setFilters(NO_FILTERS)}>Quitar filtros</Button>}
        </Stack>
        <Typography variant="caption" color="text.secondary">Los iconos indican las dimensiones de seguridad humana y los ODS de cada recomendación</Typography>
      </Stack>

      <Box id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${acceptance}`}>
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
          {rows.map((item) => (
            <Box
              component="li"
              key={item.public_id}
              sx={{
                position: "relative", display: "grid", alignItems: "start", columnGap: 3, rowGap: 1.5,
                gridTemplateColumns: { xs: "minmax(0,1fr)", md: "88px minmax(0,1fr) 172px 24px" },
                py: { xs: 2.25, md: 2.75 }, borderBottom: "1px solid", borderColor: "divider", transition: "background-color .15s",
                "&:hover": { bgcolor: { md: brand.soft } },
                "&:hover .hrct-rec-title": { color: brand.accentInk },
                "&:hover .hrct-rec-go": { color: brand.accentInk, transform: "translateX(3px)" },
                "&:has(a:active)": { bgcolor: "rgba(0,163,224,.09)" },
                // A priority keeps its text aligned, with a restrained brand accent in the gutter.
                ...(item.priority && { mx: -2, px: 2, boxShadow: "inset 3px 0 0 #00a3e0" }),
              }}
            >
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>Recomendación</Typography>
                <Typography color="primary.main" sx={{ fontSize: "1.35rem", fontWeight: 500, lineHeight: 1.25, fontVariantNumeric: "tabular-nums" }}>{item.number}</Typography>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" columnGap={1.5} rowGap={.25} alignItems="center" flexWrap="wrap" sx={{ mb: .75 }}>
                  <Typography variant="caption" color="primary.main" sx={{ display: { md: "none" }, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Recomendación {item.number}</Typography>
                  {item.priority && <PriorityTag />}
                  <StatusChip status={item.status} />
                  <Typography variant="caption" color="text.secondary">{item.acceptance ? `${acceptanceLabels[item.acceptance] || item.acceptance} por España` : "Respuesta del Estado pendiente"}</Typography>
                  {item.provisional && <Typography variant="caption" color="text.secondary">Pendiente de confirmación final</Typography>}
                  {item.developments > 0 && <Typography variant="caption" color="text.secondary">{item.developments} {item.developments === 1 ? "novedad" : "novedades"} en seguimiento</Typography>}
                </Stack>
                <Typography component="h3" variant="h6" sx={{ lineHeight: 1.35 }}>
                  {/* The link covers the whole row; the marks of the classification stay above it. */}
                  <Box
                    className="hrct-rec-title"
                    component={Link}
                    href={`/commitments/${encodeURIComponent(item.public_id)}`}
                    sx={{ color: "primary.main", textDecoration: "none", transition: "color .15s", "&::after": { content: '""', position: "absolute", inset: 0 }, "&:focus-visible": { outline: "none" }, "&:focus-visible::after": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 } }}
                  >
                    {item.title}
                  </Box>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .6, maxWidth: 760, lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: { xs: 3, md: 2 }, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.summary}
                </Typography>
              </Box>

              <Classification item={item} goalNames={goalNames} />
              <ArrowForwardRoundedIcon className="hrct-rec-go" aria-hidden sx={{ display: { xs: "none", md: "block" }, gridColumn: 4, mt: .5, fontSize: 20, color: "text.secondary", transition: "color .15s, transform .15s" }} />
            </Box>
          ))}
        </Box>

        {!visible.length && (
          <Box sx={{ textAlign: "center", py: 7, px: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" color="primary.main">Ninguna recomendación coincide con estos filtros</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Prueba con una búsqueda más amplia o quita alguno de los filtros.</Typography>
          </Box>
        )}
      </Box>

      {visible.length > 0 && (
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
          <Typography variant="caption" color="text.secondary">
            {(at - 1) * PAGE_SIZE + 1}–{Math.min(at * PAGE_SIZE, visible.length)} de {plural(visible.length)}
          </Typography>
          {/* Fewer page numbers on a phone, so that they stay on one line. */}
          {pages > 1 && [0, 1].map((siblings) => (
            <Pagination
              key={siblings}
              count={pages}
              page={at}
              onChange={(_, next) => goTo(next)}
              aria-label="Páginas de la lista de recomendaciones"
              shape="rounded"
              siblingCount={siblings}
              boundaryCount={1}
              getItemAriaLabel={(type, number, selected) => (type === "page" ? `${selected ? "Página" : "Ir a la página"} ${number}` : type === "previous" ? "Página anterior" : type === "next" ? "Página siguiente" : type === "first" ? "Primera página" : "Última página")}
              sx={{ display: siblings ? { xs: "none", sm: "block" } : { sm: "none" }, mx: { xs: -1, sm: 0 }, "& .MuiPagination-ul": { flexWrap: "nowrap" } }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
