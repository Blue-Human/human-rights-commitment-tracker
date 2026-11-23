import type { Metadata } from "next";
import { Divider, Stack, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { AdminItemRow } from "@/components/AdminItemRow";
import { listItemsPending } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Novedades de seguimiento | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

export default async function AdminMonitoring() {
  await requireAdmin();
  const items = await listItemsPending();
  const shown = items.filter((i) => i.is_public);
  const held = items.filter((i) => !i.is_public);
  const list = (rows: typeof items, empty: string) => (
    <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
      {rows.map((item) => <AdminItemRow key={item.id} item={item} publicId={item.commitments?.public_id || ""} recommendation={item.commitments?.recommendation_number} />)}
      {!rows.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>{empty}</Typography>}
    </Stack>
  );

  return (
    <AdminFrame title="Novedades de seguimiento" intro="Noticias y publicaciones recopiladas para las recomendaciones que todavía no has revisado. No se muestran las descartadas por no guardar relación.">
      <AdminSection title="Públicas, pendientes de confirmación final" note="Ya son visibles en la web. Apruébalas para marcarlas como revisadas o recházalas para retirarlas.">
        {list(shown, "No hay nada público pendiente de confirmación.")}
      </AdminSection>
      <AdminSection title="Guardadas para investigación" note="Guardan relación, pero no se muestran en la web. Aprueba una para publicarla.">
        {list(held, "No hay nada guardado.")}
      </AdminSection>
    </AdminFrame>
  );
}
