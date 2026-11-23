import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { annotationKinds, type PublishedAnnotation } from "@/lib/atlas/annotations";
import { articlePath, instrumentPath, longDate } from "@/lib/atlas/labels";
import { ExternalLink } from "./Quote";

// Published annotations, set apart from the official text: a different background, the author's
// name and the kind of note, always visible.
export function AnnotationList({ annotations, empty, showTarget = false }: { annotations: PublishedAnnotation[]; empty: string; showTarget?: boolean }) {
  if (!annotations.length) return <Typography variant="body2" color="text.secondary">{empty}</Typography>;
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {annotations.map((a) => (
        <Box component="article" key={a.id} id={`nota-${a.id}`} sx={{ p: { xs: 2, md: 2.5 }, bgcolor: "#fbf8f1", borderLeft: `3px solid #a87b2a` }}>
          <Typography variant="overline" sx={{ color: "#7a5600" }}>Anotación de Blue Human · {annotationKinds[a.kind] || a.kind}</Typography>
          <Typography component="h3" variant="h6" color="primary.main" sx={{ mt: .25 }}>{a.title}</Typography>
          {showTarget && (
            <Typography variant="caption" color="text.secondary">
              Sobre <Link href={a.article ? articlePath(a.instrument_id, a.article) : instrumentPath(a.instrument_id)}>{a.article ? `el artículo ${a.article}` : "el instrumento"}</Link>
            </Typography>
          )}
          <Typography sx={{ mt: 1, lineHeight: 1.75, whiteSpace: "pre-line" }}>{a.body}</Typography>
          {(a.sources?.length || a.doc_references?.length) ? (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Fuentes</Typography>
              {[...(a.sources || []), ...(a.doc_references || [])].map((s, i) => (
                <Typography key={i} variant="caption" sx={{ display: "block" }}>{s.url ? <ExternalLink href={s.url}>{s.label}</ExternalLink> : s.label}</Typography>
              ))}
            </Box>
          ) : null}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, pt: 1, borderTop: `1px solid ${brand.border}` }}>
            {a.author_name} · publicada el {longDate(a.published_at.slice(0, 10))}{a.updated_at && a.updated_at.slice(0, 10) !== a.published_at.slice(0, 10) ? ` · última modificación el ${longDate(a.updated_at.slice(0, 10))}` : ""} · versión {a.version}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
