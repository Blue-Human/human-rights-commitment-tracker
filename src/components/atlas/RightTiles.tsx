import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { rightPath } from "@/lib/atlas/labels";
import type { Right } from "@/lib/atlas/types";

export function rightCounts(r: Right) {
  return {
    articles: new Set(r.articles.map((a) => `${a.instrument}:${a.article}`)).size,
    instruments: new Set([...r.articles.map((a) => a.instrument), ...r.instruments.map((i) => i.instrument)]).size,
    interpretations: r.interpretations.length,
  };
}

const count = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : null);

// The rights of the Atlas as an index: the name, and what the Atlas links to each one.
export function RightTiles({ rights }: { rights: Right[] }) {
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, columnGap: 4, borderTop: "1px solid", borderColor: "divider" }}>
      {rights.map((r) => {
        const n = rightCounts(r);
        const line = [count(n.articles, "artículo", "artículos"), count(n.instruments, "instrumento", "instrumentos"), count(n.interpretations, "observación", "observaciones")].filter(Boolean).join(" · ");
        return (
          <Box component="li" key={r.id} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
            <Box component={Link} href={rightPath(r.id)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: 1.5, minHeight: 72, color: "inherit", textDecoration: "none", "&:hover .n": { color: brand.accentInk }, "&:hover .go": { opacity: 1, transform: "translateX(2px)" }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography className="n" color="primary.main" sx={{ fontWeight: 500, lineHeight: 1.35, transition: "color .15s" }}>{r.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .25 }}>{line || "Sin vínculos documentados todavía"}</Typography>
              </Box>
              <Box className="go" aria-hidden sx={{ color: brand.accentInk, opacity: .4, transition: "opacity .15s, transform .15s", flexShrink: 0 }}>→</Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
