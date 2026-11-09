import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { articlePath, longDate } from "@/lib/atlas/labels";
import type { ArticleNode, TextFile, TextNode } from "@/lib/atlas/types";

export type ArticleContext = { interpretations: number; decisions: number; rights: { id: string; name: string }[]; notice?: string };

function Paragraphs({ node }: { node: ArticleNode }) {
  return (
    <>
      {node.paragraphs.map((p) => p.table ? (
        <Box key={p.id} sx={{ overflowX: "auto", my: 1.5 }}>
          <Box component="table" sx={{ borderCollapse: "collapse", fontSize: ".85rem", "& td": { border: `1px solid ${brand.border}`, p: .75, verticalAlign: "top" } }}>
            <tbody>{p.table.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
          </Box>
        </Box>
      ) : (
        <Typography key={p.id} id={p.id} component="p" sx={{ my: 1, lineHeight: 1.75, whiteSpace: "pre-line", scrollMarginTop: 120, "&:target": { bgcolor: brand.accentSoft } }}>{p.text}</Typography>
      ))}
    </>
  );
}

function Heading({ node }: { node: Extract<TextNode, { kind: "heading" }> }) {
  const Tag = node.level <= 1 ? "h2" : node.level === 2 ? "h3" : "h4";
  return (
    <Box data-heading id={node.id} sx={{ mt: node.level <= 1 ? 5 : 3.5, mb: 1.5, scrollMarginTop: 120 }}>
      <Typography component={Tag} color="primary.main" sx={{ fontSize: node.level <= 1 ? "1.15rem" : "1rem", fontWeight: 600, letterSpacing: ".02em", textTransform: node.annex ? "none" : undefined }}>
        {node.label}
        {node.title && <Box component="span" sx={{ display: "block", fontWeight: 500, letterSpacing: 0, mt: .25 }}>{node.title}</Box>}
      </Typography>
      {node.text?.map((t, i) => <Typography key={i} sx={{ my: 1, lineHeight: 1.75, whiteSpace: "pre-line" }}>{t}</Typography>)}
    </Box>
  );
}

// The text of an instrument, article by article, as the official publication prints it. Each
// article has a permanent address (#art-6) and a page of its own; what the BOE adds to a provision
// (its notes, the previous wording) is shown apart from the text.
export function TextReader({ text, instrument, context, id = "reader" }: { text: TextFile; instrument: string; context: Map<string, ArticleContext>; id?: string }) {
  return (
    <Box id={id} lang={text.lang}>
      {text.title && <Typography component="p" sx={{ fontWeight: 600, color: "primary.main", letterSpacing: ".02em", mb: 2 }}>{text.title}</Typography>}
      {text.preamble.length > 0 && (
        <Box component="details" data-heading open={text.preamble.length <= 3} sx={{ mb: 3, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", "& > summary": { cursor: "pointer", py: 1.5, fontWeight: 500, color: "primary.main" } }}>
          <summary id="preambulo">Preámbulo</summary>
          {text.preamble.map((p) => <Typography key={p.id} sx={{ my: 1, lineHeight: 1.75 }}>{p.text}</Typography>)}
        </Box>
      )}
      {text.nodes.map((node) => node.kind === "heading" ? <Heading key={node.id} node={node} /> : (
        <Box component="article" key={node.id} id={node.id} data-article aria-labelledby={`${node.id}-h`} sx={{ py: 2, borderTop: "1px solid", borderColor: "divider", scrollMarginTop: 120, "&:target": { bgcolor: brand.accentSoft } }}>
          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
            <Typography id={`${node.id}-h`} component="h3" color="primary.main" sx={{ fontSize: "1.02rem", fontWeight: 600 }}>
              <Box component={Link} href={articlePath(instrument, node.number)} sx={{ color: "inherit", textDecoration: "none", "&:hover": { color: "secondary.dark" } }}>{node.label}</Box>
              {node.heading && <Box component="span" sx={{ fontWeight: 500 }}>{". "}{node.heading}</Box>}
            </Typography>
            <Box component="a" href={`#${node.id}`} aria-label={`Enlace a ${node.label}`} sx={{ color: "text.disabled", fontSize: ".8rem", textDecoration: "none", flexShrink: 0, "&:hover": { color: "secondary.dark" } }}>#</Box>
          </Box>
          {context.get(node.number)?.notice && (
            <Typography variant="body2" sx={{ mt: 1, p: 1.25, bgcolor: "#fff8e6", borderLeft: "3px solid #a87b2a", lineHeight: 1.6 }}>{context.get(node.number)!.notice}</Typography>
          )}
          <Paragraphs node={node} />
          {node.notes && node.notes.length > 0 && (
            <Box component="aside" aria-label="Notas del BOE" sx={{ mt: 1.5, p: 1.25, bgcolor: brand.soft, borderLeft: `2px solid ${brand.border}` }}>
              <Typography variant="overline" color="text.secondary">Notas del BOE (no forman parte del texto del tratado)</Typography>
              {node.notes.map((n, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ mt: .5, lineHeight: 1.6, whiteSpace: "pre-line" }}>{n}</Typography>)}
            </Box>
          )}
          {node.history && node.history.length > 0 && (
            <Box component="details" sx={{ mt: 1.25, "& > summary": { cursor: "pointer", fontSize: ".85rem", color: "secondary.dark" } }}>
              <summary>Versiones anteriores publicadas en el BOE ({node.history.length})</summary>
              {node.history.map((v) => (
                <Box key={v.norm + v.published} sx={{ mt: 1, pl: 1.5, borderLeft: `2px solid ${brand.border}` }}>
                  <Typography variant="caption" color="text.secondary">Versión publicada el {longDate(v.published)} ({v.norm}){v.in_force ? `, vigente desde el ${longDate(v.in_force)}` : ""}</Typography>
                  {v.paragraphs.map((t, i) => <Typography key={i} variant="body2" sx={{ my: .5, lineHeight: 1.65, color: "text.secondary" }}>{t}</Typography>)}
                </Box>
              ))}
            </Box>
          )}
          {(() => {
            const c = context.get(node.number);
            if (!c || (!c.interpretations && !c.decisions && !c.rights.length)) return null;
            return (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                <Box component={Link} href={articlePath(instrument, node.number)} sx={{ color: "secondary.dark" }}>
                  {[c.interpretations && `${c.interpretations} ${c.interpretations === 1 ? "observación general" : "observaciones generales"}`,
                    c.decisions && `${c.decisions} ${c.decisions === 1 ? "decisión" : "decisiones"}`,
                    c.rights.length && c.rights.map((r) => r.name).join(", ")].filter(Boolean).join(" · ")}
                </Box>
              </Typography>
            );
          })()}
        </Box>
      ))}
      {text.final_clauses.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          {text.final_clauses.map((f, i) => <Typography key={i} sx={{ my: 1, lineHeight: 1.75, color: "text.secondary" }}>{f.text}</Typography>)}
        </Box>
      )}
    </Box>
  );
}

// The index of the text: parts, chapters and articles, as links to their anchors.
export function TextIndex({ text }: { text: TextFile }) {
  return (
    <Box component="nav" aria-label="Índice del texto" sx={{ fontSize: ".85rem", "& a": { display: "block", py: .45, color: "text.secondary", textDecoration: "none", lineHeight: 1.35, "&:hover": { color: "secondary.dark" } } }}>
      {text.preamble.length > 0 && <a href="#preambulo">Preámbulo</a>}
      {text.nodes.map((node) => node.kind === "heading"
        ? <Box key={node.id} component="a" href={`#${node.id}`} sx={{ mt: 1.25, fontWeight: 600, color: "primary.main !important", pl: node.level > 1 ? 1 : 0 }}>{node.label}{node.title ? ` · ${node.title}` : ""}</Box>
        : <Box key={node.id} component="a" href={`#${node.id}`} sx={{ pl: 1.5 }}>{node.label}{node.heading ? `. ${node.heading}` : ""}</Box>)}
    </Box>
  );
}
