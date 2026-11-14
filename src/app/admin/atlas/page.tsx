import type { Metadata } from "next";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { adminRest } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";
import { annotationKinds } from "@/lib/atlas/annotations";
import { getInstruments } from "@/lib/atlas/data";
import { instrumentTitle } from "@/lib/atlas/labels";
import { moveAnnotation, saveAnnotation } from "./actions";

export const metadata: Metadata = { title: "Anotaciones del Atlas | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

type Row = { id: string; instrument_id: string; article: string | null; paragraph: string | null; kind: string; title: string; body: string; author_name: string;
  sources: { label: string; url: string | null }[]; doc_references: { label: string; url: string | null }[]; status: string; approved_by: string | null; version: number; updated_at: string };

const statusNames: Record<string, string> = { draft: "Borrador", in_review: "Pendiente de revisión", approved: "Aprobada", published: "Publicada", archived: "Archivada" };
const next: Record<string, [string, string][]> = {
  draft: [["in_review", "Enviar a revisión"]],
  in_review: [["approved", "Aprobar"], ["draft", "Devolver a borrador"]],
  approved: [["published", "Publicar"], ["draft", "Devolver a borrador"]],
  published: [["archived", "Archivar"]],
  archived: [["draft", "Recuperar como borrador"]],
};
const lines = (items: { label: string; url: string | null }[]) => items.map((x) => (x.url ? `${x.label} | ${x.url}` : x.label)).join("\n");

function Editor({ row, instruments }: { row?: Row; instruments: { id: string; title: string }[] }) {
  return (
    <form action={saveAnnotation}>
      {row && <input type="hidden" name="id" value={row.id} />}
      <Stack spacing={1.5} sx={{ maxWidth: 820 }}>
        <TextField name="instrument_id" label="Instrumento" select SelectProps={{ native: true }} defaultValue={row?.instrument_id || "un-iccpr"} required>
          {instruments.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
        </TextField>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField name="article" label="Artículo (opcional)" defaultValue={row?.article || ""} />
          <TextField name="paragraph" label="Apartado (opcional)" defaultValue={row?.paragraph || ""} />
          <TextField name="kind" label="Tipo" select SelectProps={{ native: true }} defaultValue={row?.kind || "academic_note"} sx={{ minWidth: 260 }}>
            {Object.entries(annotationKinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </TextField>
        </Stack>
        <TextField name="title" label="Título" defaultValue={row?.title} required />
        <TextField name="body" label="Contenido" defaultValue={row?.body} multiline minRows={5} required />
        <TextField name="author_name" label="Autor o autora (firma)" defaultValue={row?.author_name} required />
        <TextField name="sources" label="Fuentes utilizadas (una por línea: etiqueta | URL)" defaultValue={row ? lines(row.sources) : ""} multiline minRows={2} helperText="Obligatorio para publicar." />
        <TextField name="doc_references" label="Referencias documentales (una por línea: etiqueta | URL)" defaultValue={row ? lines(row.doc_references) : ""} multiline minRows={2} />
        <Box><Button type="submit" variant="contained">{row ? "Guardar cambios" : "Crear borrador"}</Button></Box>
        {row && ["approved", "published"].includes(row.status) && <Typography variant="caption" color="text.secondary">Si se cambia el contenido, la nota vuelve a borrador y debe aprobarse de nuevo.</Typography>}
      </Stack>
    </form>
  );
}

export default async function AdminAtlas({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; edit?: string }> }) {
  await requireAdmin();
  const [{ error, saved, edit }, rows, all] = await Promise.all([
    searchParams,
    adminRest<Row[]>("atlas_annotations?select=*&order=updated_at.desc").catch(() => null),
    getInstruments(),
  ]);
  const instruments = all.map((i) => ({ id: i.id, title: instrumentTitle(i) }));
  const editing = rows?.find((r) => r.id === edit);
  return (
    <AdminFrame title="Anotaciones del Atlas" intro="Notas firmadas de Blue Human sobre instrumentos y artículos. Flujo: borrador → pendiente de revisión → aprobada → publicada → archivada. Solo las publicadas son visibles; cada cambio queda en el historial de versiones.">
      {error && <Typography color="error" sx={{ mb: 2 }}>No se ha podido guardar: {error}</Typography>}
      {saved && <Typography color="success.main" sx={{ mb: 2 }}>Guardado.</Typography>}
      {rows === null && <Typography color="error">La tabla de anotaciones no está disponible (falta aplicar la migración 20261109_atlas_annotations.sql).</Typography>}
      <AdminSection title={editing ? `Editar: ${editing.title}` : "Nueva anotación"}>
        <Editor key={editing?.id || "new"} row={editing} instruments={instruments} />
      </AdminSection>
      <AdminSection title={`Anotaciones (${rows?.length || 0})`}>
        {(rows || []).map((r) => (
          <Box key={r.id} sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">{statusNames[r.status]} · versión {r.version} · {r.instrument_id}{r.article ? ` art. ${r.article}` : ""} · {annotationKinds[r.kind]}{r.approved_by ? ` · aprobada por ${r.approved_by}` : ""}</Typography>
            <Typography sx={{ fontWeight: 500 }}>{r.title} <Typography component="span" variant="body2" color="text.secondary">· {r.author_name}</Typography></Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }} alignItems="center">
              <Button size="small" href={`/admin/atlas?edit=${r.id}`}>Editar</Button>
              {next[r.status].map(([to, label]) => (
                <form key={to} action={moveAnnotation}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value={to} /><input type="hidden" name="instrument_id" value={r.instrument_id} />
                  {to === "approved" && <TextField name="reviewer" placeholder="Nombre de quien revisa" required size="small" sx={{ mr: 1, width: 210 }} />}
                  <Button size="small" variant="outlined" type="submit">{label}</Button>
                </form>
              ))}
            </Stack>
          </Box>
        ))}
      </AdminSection>
    </AdminFrame>
  );
}
