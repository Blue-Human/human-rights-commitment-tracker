"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminRest } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// "Etiqueta | https://..." per line → [{label, url}].
function links(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, url] = line.split("|").map((x) => x.trim());
    return { label, url: url && /^https?:\/\//.test(url) ? url : null };
  });
}

function refresh(instrument?: string) {
  revalidateTag("atlas-annotations");
  revalidatePath("/admin/atlas");
  revalidatePath("/rights/annotations");
  if (instrument) revalidatePath(`/rights/instruments/${instrument}`, "layout");
}

export async function saveAnnotation(form: FormData) {
  await requireAdmin();
  const id = text(form, "id");
  const instrument = text(form, "instrument_id");
  const values = {
    instrument_id: instrument, article: text(form, "article") || null, paragraph: text(form, "paragraph") || null,
    kind: text(form, "kind"), title: text(form, "title"), body: text(form, "body"), author_name: text(form, "author_name"),
    sources: links(text(form, "sources")), doc_references: links(text(form, "doc_references")),
  };
  try {
    if (id) await adminRest(`atlas_annotations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) });
    else await adminRest("atlas_annotations", { method: "POST", body: JSON.stringify(values) });
  } catch (error) {
    redirect(`/admin/atlas?error=${encodeURIComponent(String(error).slice(0, 200))}`);
  }
  refresh(instrument);
  redirect("/admin/atlas?saved=1");
}

// Moves a note along the workflow; the database refuses any transition the workflow does not allow
// and any approval or publication without a named reviewer.
export async function moveAnnotation(form: FormData) {
  await requireAdmin();
  const id = text(form, "id"), to = text(form, "to"), reviewer = text(form, "reviewer");
  const values: Record<string, unknown> = { status: to };
  if (to === "approved") Object.assign(values, { approved_by: reviewer || null, approved_at: new Date().toISOString() });
  try {
    await adminRest(`atlas_annotations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) });
  } catch (error) {
    redirect(`/admin/atlas?error=${encodeURIComponent(String(error).slice(0, 200))}`);
  }
  refresh(text(form, "instrument_id"));
  redirect("/admin/atlas");
}
