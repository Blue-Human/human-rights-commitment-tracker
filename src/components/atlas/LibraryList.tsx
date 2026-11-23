"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { brand } from "@/brand";
import { fold, queryWords } from "@/lib/search";

export type LibraryRow = {
  id: string; href: string; title: string; popular?: string; system: string; systemName: string; kind: string; kindName: string;
  category: string; categoryName: string; parent?: string; date?: string | null; eif?: string | null; parties?: string | null; readable: boolean; lacks?: string | null;
};

const all = "";

// The library, filtered in the browser by system, type and wording; the list is complete in the
// page as served, for readers without scripts and for search engines.
export function LibraryList({ rows }: { rows: LibraryRow[] }) {
  const [system, setSystem] = useState(all);
  const [kind, setKind] = useState(all);
  const [text, setText] = useState(all);
  const [query, setQuery] = useState("");
  const words = useMemo(() => queryWords(query), [query]);
  const options = (key: "system" | "kind", name: "systemName" | "kindName") => [...new Map(rows.map((r) => [r[key], r[name]])).entries()];
  const shown = rows.filter((r) => (!system || r.system === system) && (!kind || r.kind === kind) && (!text || (text === "yes") === r.readable)
    && words.every((w) => fold(`${r.title} ${r.popular || ""} ${r.id}`).includes(w)));
  const groups = [...new Map(shown.map((r) => [r.category, r.categoryName])).entries()];

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "2fr 1fr 1fr 1fr" }, gap: 1.5, mb: 3 }}>
        <TextField label="Buscar por título" value={query} onChange={(e) => setQuery(e.target.value)} />
        <TextField select label="Sistema" value={system} onChange={(e) => setSystem(e.target.value)}>
          <MenuItem value={all}>Todos</MenuItem>
          {options("system", "systemName").map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <TextField select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
          <MenuItem value={all}>Todos</MenuItem>
          {options("kind", "kindName").map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <TextField select label="Texto en el Atlas" value={text} onChange={(e) => setText(e.target.value)}>
          <MenuItem value={all}>Todos</MenuItem>
          <MenuItem value="yes">Legible por artículos</MenuItem>
          <MenuItem value="no">Solo metadatos y enlace</MenuItem>
        </TextField>
      </Box>
      <Typography role="status" variant="caption" color="text.secondary">{shown.length} de {rows.length} instrumentos</Typography>
      {groups.map(([category, name]) => (
        <Box key={category} component="section" sx={{ mt: 3 }}>
          <Typography component="h2" variant="overline" color="text.secondary">{name}</Typography>
          <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
            {shown.filter((r) => r.category === category).map((r) => (
              <Box component="li" key={r.id} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <Box component={Link} href={r.href} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) 170px 150px" }, columnGap: 3, rowGap: .5, py: 1.75, pl: r.parent ? { md: 3 } : 0, color: "inherit", textDecoration: "none", "&:hover .t": { color: brand.accentInk }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">{r.systemName} · {r.kindName}{r.date ? ` · ${r.date}` : ""}</Typography>
                    <Typography className="t" color="primary.main" sx={{ fontWeight: 500, lineHeight: 1.4, transition: "color .15s" }}>{r.title}</Typography>
                    {r.popular && <Typography variant="body2" color="text.secondary">«{r.popular}»</Typography>}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>{r.parties ?? ""}</Typography>
                  <Typography variant="body2" sx={{ alignSelf: "center", color: r.readable ? brand.accentInk : "text.secondary", fontWeight: r.readable ? 600 : 400 }}>
                    {r.readable ? "Texto por artículos" : r.lacks || "Solo metadatos"}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
