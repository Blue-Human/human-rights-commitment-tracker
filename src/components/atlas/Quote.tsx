import Link from "next/link";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { articlePath, instrumentTitle } from "@/lib/atlas/labels";
import type { Instrument, Quote } from "@/lib/atlas/types";

// "Art. 35, apdo. 1" from a reference {a: "35", p: "1"} ("1.b" → "apdo. 1, letra b").
export function locator(q: Pick<Quote, "a" | "p" | "doc">) {
  if (q.doc) {
    const [number, letter] = String(q.p || "").split(".");
    return `Párr. ${number}${letter ? `, letra ${letter})` : ""}`;
  }
  const [first, second] = String(q.p || "").split(".");
  const isNumber = /^\d+$/.test(first || "");
  const part = !q.p ? "" : isNumber ? `, apdo. ${first}${second ? `, letra ${second})` : ""}` : `, letra ${first})`;
  return `Art. ${q.a}${part}`;
}

// A provision quoted word for word from the official text loaded in the Atlas, with where it comes
// from. When the instrument's text is not in the Atlas, only the reference is given.
export function QuoteBlock({ q, instruments, compact = false }: { q: Quote; instruments: Map<string, Instrument>; compact?: boolean }) {
  const instrument = q.i ? instruments.get(q.i) : undefined;
  const title = q.doc ? q.document_title || q.source?.identifier : instrument ? instrumentTitle(instrument) : q.i;
  const href = q.i && q.a && q.quote ? articlePath(q.i, q.a) : null;
  const reference = (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.5 }}>
      {href ? <Box component={Link} href={href} sx={{ color: "secondary.dark", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{locator(q)}</Box>
        : <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{locator(q)}</Box>}
      {" · "}{title}
      {q.doc && q.source?.identifier && <> · {q.source.identifier}</>}
    </Typography>
  );
  if (!q.quote) {
    return (
      <Box sx={{ py: 1.25 }}>
        {reference}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .25, fontStyle: "italic" }}>
          {q.unavailable || "Cita no incorporada."}
        </Typography>
      </Box>
    );
  }
  return (
    <Box component="figure" sx={{ m: 0, py: compact ? 1 : 1.5 }}>
      {reference}
      <Box component="blockquote" lang={q.lang === "en" ? "en" : "es"} sx={{ m: 0, mt: .75, pl: 1.75, borderLeft: `2px solid ${brand.accent}`, color: "text.primary", fontSize: compact ? ".9rem" : ".95rem", lineHeight: 1.7, whiteSpace: "pre-line" }}>
        {q.quote}
      </Box>
      {q.lang === "en" && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>Texto en inglés: no se dispone de una versión oficial en español incorporada.</Typography>}
    </Box>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const internal = href.startsWith("/");
  return (
    <Box component={internal ? Link : "a"} href={href} {...(!internal && { target: "_blank", rel: "noreferrer" })}
      sx={{ color: "secondary.dark", textDecorationColor: "rgba(0,108,149,.4)", textUnderlineOffset: "3px", display: "inline-flex", alignItems: "center", gap: .4, "&:hover": { color: brand.navy } }}>
      {children}{!internal && <OpenInNewRoundedIcon sx={{ fontSize: 14 }} aria-label="(se abre en otra pestaña)" />}
    </Box>
  );
}

// Where a value comes from: the source, the date of retrieval and the link.
export function SourceNote({ label, href, retrieved, children }: { label: string; href?: string | null; retrieved?: string | null; children?: React.ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>
      Fuente: {href ? <ExternalLink href={href}>{label}</ExternalLink> : label}
      {retrieved && <> · consultada el {retrieved.split("-").reverse().join("/")}</>}
      {children}
    </Typography>
  );
}

export function Pill({ children, tone = brand.muted, title }: { children: React.ReactNode; tone?: string; title?: string }) {
  return (
    <Box component="span" title={title} sx={{ display: "inline-flex", alignItems: "center", gap: .6, px: .9, py: .2, border: "1px solid", borderColor: brand.border, fontSize: ".72rem", fontWeight: 600, color: tone, lineHeight: 1.6, whiteSpace: "nowrap" }}>
      {children}
    </Box>
  );
}

export function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return <Box component="span" aria-hidden sx={{ display: "inline-block", width: size, height: size, bgcolor: color, flexShrink: 0 }} />;
}
