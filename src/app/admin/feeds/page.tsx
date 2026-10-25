import type { Metadata } from "next";
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { listFeeds } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";
import { formatDate } from "@/lib/hrct";
import { addFeed, toggleFeed } from "../actions";

export const metadata: Metadata = { title: "Fuentes | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

const types: [string, string][] = [["news", "Medio de comunicación"], ["official_web", "Institución oficial"], ["un_body", "Órgano de la ONU"], ["civil_society", "Sociedad civil"]];
const typeLabel = Object.fromEntries(types);

export default async function AdminFeeds({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const [feeds, { error }] = await Promise.all([listFeeds(), searchParams]);

  return (
    <AdminFrame title="Fuentes" intro="Canales RSS y Atom que se leen en cada consulta diaria. Un canal desactivado se omite.">
      <AdminSection title={`Canales (${feeds.filter((f) => f.enabled).length} de ${feeds.length} activos)`}>
        <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {feeds.map((f, index) => (
            <Stack key={f.id} direction={{ xs: "column", md: "row" }} spacing={{ xs: .6, md: 2.5 }} alignItems={{ md: "center" }}
              sx={{ py: 1.3, borderTop: index ? "1px solid" : "none", borderColor: "divider", opacity: f.enabled ? 1 : .55 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>{f.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>{f.url}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ width: { md: 130 }, flexShrink: 0 }}>{typeLabel[f.source_type] || f.source_type}</Typography>
              <Typography variant="caption" color={f.last_status && f.last_status !== "ok" ? "error" : "text.secondary"} sx={{ width: { md: 210 }, flexShrink: 0 }}>
                {f.last_fetched_at ? `${f.last_status === "ok" ? `${f.last_item_count} entradas` : f.last_status} · ${formatDate(f.last_fetched_at)}` : "Todavía sin leer"}
              </Typography>
              <form action={toggleFeed}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="enabled" value={String(!f.enabled)} />
                <Button type="submit" size="small" variant="outlined" sx={{ width: 104 }}>{f.enabled ? "Desactivar" : "Activar"}</Button>
              </form>
            </Stack>
          ))}
        </Box>
      </AdminSection>

      <AdminSection title="Añadir un canal" note="Marca «Sobre España» en los canales que solo tratan de España; en los demás solo se tienen en cuenta las entradas que mencionan a España.">
        <form action={addFeed}>
          <Stack spacing={2} sx={{ maxWidth: 720 }}>
            <TextField name="name" label="Nombre" required fullWidth />
            <TextField name="url" label="URL del canal" type="url" required fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <TextField name="source_type" label="Tipo" select SelectProps={{ native: true }} defaultValue="news" sx={{ minWidth: 220 }}>
                {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </TextField>
              <FormControlLabel control={<Checkbox name="spain_focused" defaultChecked />} label="Sobre España" />
            </Stack>
            {error && <Typography variant="body2" color="error">Hacen falta un nombre y una URL http(s) válida.</Typography>}
            <Box><Button type="submit" variant="contained">Añadir canal</Button></Box>
          </Stack>
        </form>
      </AdminSection>
    </AdminFrame>
  );
}
