import type { Metadata } from "next";
import { Divider, Stack, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { AdminItemRow } from "@/components/AdminItemRow";
import { listItemsPending } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Monitoring items | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

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
    <AdminFrame title="Monitoring items" intro="News and publications collected for the recommendations that you have not reviewed yet. Items discarded as unrelated are not listed.">
      <AdminSection title="Public, pending final confirmation" note="Already visible on the site. Approve to mark them as reviewed, or reject to remove them.">
        {list(shown, "Nothing public is waiting for confirmation.")}
      </AdminSection>
      <AdminSection title="Kept for research" note="Related but not shown on the site. Approve to publish one.">
        {list(held, "Nothing is being held.")}
      </AdminSection>
    </AdminFrame>
  );
}
