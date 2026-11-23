"use client";

import { useId, useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { channelNotes, dimensionNames, labelOf, monitoringChannel, sourceTypeLabels, type MonitoringChannel } from "@/lib/hrct";
import { MonitoringCard, sourceName, type CardItem } from "./MonitoringCard";

// A development with what the filters look at: the human-security dimensions and the numbers
// of the recommendations it relates to.
export type ExplorerItem = CardItem & { dimensions: string[]; numbers: string[] };

type Channel = "all" | MonitoringChannel;

const tabs: [Channel, string][] = [["all", "Todas"], ["need", "Contexto"], ["implementation", "Posibles avances"], ["contradiction", "En sentido contrario"]];
const ALL_NOTE = "Cada novedad se relaciona con una o varias recomendaciones. Es material de seguimiento: por sí sola no modifica ninguna valoración de Blue Human.";

// The grid grows on request, like the list of recommendations.
const PAGE_SIZE = 12;

export function MonitoringExplorer({ items }: { items: ExplorerItem[] }) {
  const [channel, setChannel] = useState<Channel>("all");
  const [query, setQuery] = useState("");
  const [dimension, setDimension] = useState("all");
  const [source, setSource] = useState("all");
  const id = useId();
  const filterKey = `${channel}|${query}|${dimension}|${source}`;
  const [expanded, setExpanded] = useState({ key: filterKey, count: PAGE_SIZE });
  const shown = expanded.key === filterKey ? expanded.count : PAGE_SIZE;

  const sourceTypes = useMemo(() => [...new Set(items.map((item) => item.source_type))], [items]);
  const dimensions = useMemo(() => Object.entries(dimensionNames).filter(([code]) => items.some((item) => item.dimensions.includes(code))), [items]);
  const hasContrary = useMemo(() => items.some((item) => monitoringChannel(item) === "contradiction"), [items]);

  // The counts on the tabs follow the search and the two selects, so they always match the grid.
  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase();
    // A recommendation number is matched whole: "50.10" is not "50.100".
    const number = /^\d+\.\d+$/.test(words);
    return items.filter((item) =>
      (!words || (number ? item.numbers.includes(words) : `${item.title} ${sourceName(item)} ${item.summary ?? ""}`.toLowerCase().includes(words)))
      && (dimension === "all" || item.dimensions.includes(dimension))
      && (source === "all" || item.source_type === source));
  }, [items, query, dimension, source]);
  const visible = channel === "all" ? filtered : filtered.filter((item) => monitoringChannel(item) === channel);
  const count = (tab: Channel) => (tab === "all" ? filtered.length : filtered.filter((item) => monitoringChannel(item) === tab).length);

  return (
    <Stack spacing={2.5}>
      <Tabs value={channel} onChange={(_, value: Channel) => setChannel(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Tipo de novedad">
        {tabs.filter(([tab]) => tab !== "contradiction" || hasContrary).map(([tab, label]) => (
          <Tab
            key={tab}
            value={tab}
            id={`${id}-tab-${tab}`}
            aria-controls={`${id}-panel`}
            label={<Box component="span">{label}<Box component="span" sx={{ ml: 1, color: "text.secondary", fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>{count(tab)}</Box></Box>}
          />
        ))}
      </Tabs>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.7 }}>
        {channel === "all" ? ALL_NOTE : channelNotes[channel]}
      </Typography>

      <Paper variant="outlined" square sx={{ p: { xs: 2, md: 2.25 }, bgcolor: "#fff" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} useFlexGap>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // "Go" on a phone keyboard puts the keyboard away: the grid filters as the reader types.
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLElement).blur(); }}
            placeholder="Buscar por titular, fuente o número de recomendación"
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
              htmlInput: { "aria-label": "Buscar por titular, fuente o número de recomendación", inputMode: "search", enterKeyHint: "search", autoCapitalize: "none", autoCorrect: "off", sx: { textOverflow: "ellipsis" } },
            }}
          />
          {dimensions.length > 0 && (
            <FormControl sx={{ minWidth: { xs: "100%", md: 230 } }}>
              <InputLabel id={`${id}-dimension`}>Seguridad humana</InputLabel>
              <Select labelId={`${id}-dimension`} label="Seguridad humana" value={dimension} onChange={(e) => setDimension(e.target.value)}>
                <MenuItem value="all">Todas las dimensiones</MenuItem>
                {dimensions.map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {sourceTypes.length > 1 && (
            <FormControl sx={{ minWidth: { xs: "100%", md: 220 } }}>
              <InputLabel id={`${id}-source`}>Tipo de fuente</InputLabel>
              <Select labelId={`${id}-source`} label="Tipo de fuente" value={source} onChange={(e) => setSource(e.target.value)}>
                <MenuItem value="all">Todas las fuentes</MenuItem>
                {sourceTypes.map((type) => <MenuItem key={type} value={type}>{labelOf(sourceTypeLabels, type)}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={.5}>
        <Typography variant="body2" color="text.secondary" aria-live="polite">{visible.length} {visible.length === 1 ? "novedad" : "novedades"}</Typography>
        {dimension !== "all" && <Typography variant="caption" color="text.secondary">Relacionadas con alguna recomendación de {dimensionNames[dimension as keyof typeof dimensionNames].toLowerCase()}</Typography>}
      </Stack>

      <Box id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${channel}`}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, gap: { xs: 1.5, md: 2.5 } }}>
          {visible.slice(0, shown).map((item) => <MonitoringCard key={item.slug} item={item} />)}
        </Box>

        {!visible.length && (
          <Box sx={{ textAlign: "center", py: 7, px: 2, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" color="primary.main">{items.length ? "Ninguna novedad coincide con estos filtros" : "Todavía no se ha publicado ninguna novedad"}</Typography>
            {items.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Prueba con una búsqueda más amplia o quita alguno de los filtros.</Typography>}
          </Box>
        )}
      </Box>

      {visible.length > shown && (
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.5}>
          <Button variant="outlined" color="primary" onClick={() => setExpanded({ key: filterKey, count: shown + PAGE_SIZE })}>
            Mostrar más novedades
          </Button>
          <Typography variant="caption" color="text.secondary">Se muestran {shown} de {visible.length}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
