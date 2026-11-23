"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { brand } from "@/brand";
import { excerpt, kindLabels, marks, queryWords, type SearchGroup, type SearchKind } from "@/lib/search";

const types: SearchKind[] = ["right", "instrument", "article", "country", "body", "procedure", "interpretation", "decision", "annotation"];

export type SearchOptions = { countries: { iso3: string; name: string }[]; systems: { code: string; name: string }[]; bodies: { id: string; name: string }[] };
type State = { q: string; type: string; system: string; country: string; body: string; from: string; to: string };

function Marked({ text, words }: { text: string; words: string[] }) {
  return <>{marks(text, words).map((part, i) => (part.hit ? <Box component="mark" key={i} sx={{ bgcolor: "rgba(0,163,224,.2)", color: "inherit" }}>{part.text}</Box> : part.text))}</>;
}

// The search page of the Atlas: words and filters are kept in the address, so a search can be
// shared; results come from /api/atlas/search, which searches the records published in the Atlas.
export function AtlasSearch({ initial, options }: { initial: State; options: SearchOptions }) {
  const [state, setState] = useState<State>(initial);
  const [groups, setGroups] = useState<SearchGroup[] | null>(null);
  const [failed, setFailed] = useState(false);
  const words = useMemo(() => queryWords(state.q), [state.q]);
  const filtered = state.type || state.system || state.country || state.body || state.from || state.to;

  useEffect(() => {
    const params = new URLSearchParams(Object.entries(state).filter(([, v]) => v) as [string, string][]);
    window.history.replaceState(null, "", `/atlas/search${params.size ? `?${params}` : ""}`);
    if (!words.length) { setGroups(null); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/atlas/search?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: { groups: SearchGroup[] }) => { setGroups(data.groups); setFailed(false); })
        .catch((error) => { if (error.name !== "AbortError") setFailed(true); });
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [state, words.length]);

  const set = (key: keyof State) => (event: { target: { value: string } }) => setState((s) => ({ ...s, [key]: event.target.value }));

  return (
    <Box>
      <TextField autoFocus fullWidth label="Buscar" value={state.q} onChange={set("q")} placeholder="Por ejemplo: tortura, artículo 14, España, Comité de Derechos Humanos" />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(6,minmax(0,1fr))" }, gap: 1.5, mt: 1.5 }}>
        <TextField select label="Tipo" value={state.type} onChange={set("type")}><MenuItem value="">Todos</MenuItem>{types.map((t) => <MenuItem key={t} value={t}>{kindLabels[t].replace("Atlas · ", "")}</MenuItem>)}</TextField>
        <TextField select label="Sistema" value={state.system} onChange={set("system")}><MenuItem value="">Todos</MenuItem>{options.systems.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}</TextField>
        <TextField select label="País" value={state.country} onChange={set("country")}><MenuItem value="">Todos</MenuItem>{options.countries.map((c) => <MenuItem key={c.iso3} value={c.iso3}>{c.name}</MenuItem>)}</TextField>
        <TextField select label="Órgano" value={state.body} onChange={set("body")}><MenuItem value="">Todos</MenuItem>{options.bodies.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField>
        <TextField label="Desde (año)" value={state.from} onChange={set("from")} inputProps={{ inputMode: "numeric", maxLength: 4 }} />
        <TextField label="Hasta (año)" value={state.to} onChange={set("to")} inputProps={{ inputMode: "numeric", maxLength: 4 }} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Se buscan todas las palabras, sin distinguir mayúsculas ni tildes. El filtro de país se aplica a los países y a las decisiones; el de fechas, a los registros con fecha.
      </Typography>

      <Box role="region" aria-live="polite" sx={{ mt: 3 }}>
        {failed && <Typography color="error">No se ha podido completar la búsqueda. Inténtelo de nuevo.</Typography>}
        {groups && !groups.length && <Typography color="text.secondary">Sin resultados{filtered ? " con los filtros elegidos" : ""}.</Typography>}
        {groups?.map((group) => (
          <Box key={group.kind} component="section" sx={{ mb: 3 }}>
            <Typography component="h2" variant="overline" color="text.secondary">{kindLabels[group.kind]} · {group.total}</Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
              {group.entries.map((entry) => {
                const external = !entry.href.startsWith("/");
                const inner = (
                  <>
                    <Typography sx={{ fontWeight: 500, color: "primary.main" }}><Marked text={entry.title} words={words} /></Typography>
                    {entry.note && <Typography variant="caption" color="text.secondary">{entry.note}</Typography>}
                    {entry.text && <Typography variant="body2" color="text.secondary" sx={{ mt: .25 }}><Marked text={excerpt(entry.text, words, 90)} words={words} /></Typography>}
                  </>
                );
                return (
                  <Box component="li" key={entry.href} sx={{ borderBottom: "1px solid", borderColor: "divider", "& > a": { display: "block", py: 1.25, color: "inherit", textDecoration: "none", "&:hover": { bgcolor: brand.accentSoft } } }}>
                    {external ? <a href={entry.href} target="_blank" rel="noreferrer">{inner}</a> : <Link href={entry.href}>{inner}</Link>}
                  </Box>
                );
              })}
            </Box>
            {group.total > group.entries.length && !state.type && (
              <Box component="button" type="button" onClick={() => setState((s) => ({ ...s, type: group.kind }))} sx={{ mt: 1, p: 0, border: 0, bgcolor: "transparent", color: "secondary.dark", font: "inherit", fontSize: ".9rem", cursor: "pointer", textDecoration: "underline" }}>
                Ver los {group.total} resultados
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
