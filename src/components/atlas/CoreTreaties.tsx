import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { instrumentPath, instrumentTitle } from "@/lib/atlas/labels";
import type { Instrument } from "@/lib/atlas/types";

// A short name for each of the nine core UN treaties, for the chart. The official title is always
// one hover or one click away.
const short: Record<string, string> = {
  "un-crc": "Derechos del niño",
  "un-crpd": "Personas con discapacidad",
  "un-cedaw": "Discriminación contra la mujer",
  "un-icerd": "Discriminación racial",
  "un-cat": "Tortura",
  "un-iccpr": "Derechos civiles y políticos",
  "un-icescr": "Derechos económicos, sociales y culturales",
  "un-ced": "Desapariciones forzadas",
  "un-cmw": "Trabajadores migratorios",
};

// Parties to each core treaty, as recorded by the depositary, optionally with its protocols beneath
// it. «dark» draws it on the navy of a hero.
export function CoreTreaties({ instruments, dark = false, withProtocols = true }: { instruments: Instrument[]; dark?: boolean; withProtocols?: boolean }) {
  const ink = dark ? "#fff" : brand.navy;
  const quiet = dark ? "rgba(255,255,255,.72)" : brand.muted;
  const byId = new Map(instruments.map((i) => [i.id, i]));
  const treaties = Object.keys(short).map((id) => byId.get(id)).filter((i): i is Instrument => !!i && i.status?.parties != null)
    .sort((a, b) => (b.status!.parties! - a.status!.parties!));
  const max = 200;
  const asOf = treaties[0]?.status?.as_of;
  const bar = (n: number, strong: boolean) => (
    <Box sx={{ position: "relative", height: strong ? 12 : 8, bgcolor: dark ? "rgba(255,255,255,.08)" : brand.soft }}>
      <Box sx={{ position: "absolute", inset: 0, right: "auto", width: `${(n / max) * 100}%`, bgcolor: strong ? (dark ? brand.accent : brand.accentInk) : (dark ? "#9bdcf5" : "#7cc4e2"), borderRadius: "0 4px 4px 0" }} />
    </Box>
  );
  return (
    <Box>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: dark ? 1.6 : 2.25 }}>
        {treaties.map((t) => {
          const protocols = !withProtocols ? [] : t.children.map((c) => byId.get(c)).filter((p): p is Instrument => !!p && p.kind !== "amendment" && p.status?.parties != null);
          return (
            <Box component="li" key={t.id}>
              <Box component={Link} href={instrumentPath(t.id)} title={instrumentTitle(t)} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 52px", columnGap: 1.5, rowGap: .5, alignItems: "center", color: "inherit", textDecoration: "none", "&:hover .n": { color: dark ? brand.accent : brand.accentInk }, "&:focus-visible": { outline: `2px solid ${dark ? "#fff" : brand.accentInk}`, outlineOffset: 3 } }}>
                <Typography className="n" variant="body2" sx={{ color: ink, fontWeight: 500, transition: "color .15s" }}>{short[t.id]}</Typography>
                <Typography variant="body2" sx={{ gridRow: "span 2", textAlign: "right", color: ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{t.status!.parties}</Typography>
                {bar(t.status!.parties!, true)}
              </Box>
              {protocols.map((p) => (
                <Box key={p.id} component={Link} href={instrumentPath(p.id)} title={instrumentTitle(p)} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 52px", columnGap: 1.5, alignItems: "center", mt: .75, pl: 2, color: "text.secondary", textDecoration: "none", "&:hover": { color: brand.accentInk } }}>
                  <Box>
                    <Typography variant="caption" sx={{ display: "block", lineHeight: 1.3, mb: .25 }}>{protocolNames[p.id] || "Protocolo facultativo"}</Typography>
                    {bar(p.status!.parties!, false)}
                  </Box>
                  <Typography variant="caption" sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", alignSelf: "end" }}>{p.status!.parties}</Typography>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" sx={{ display: "block", mt: 2.5, color: quiet, lineHeight: 1.6 }}>
        Estados Partes según la Colección de Tratados de las Naciones Unidas{asOf ? `, estado a ${asOf.split("-").reverse().join("/")}` : ""}. Escala de 0 a 200.
      </Typography>
    </Box>
  );
}

// What a protocol is about, in a few words taken from its official title.
const protocolNames: Record<string, string> = {
  "un-iccpr-op2": "Segundo Protocolo facultativo · abolición de la pena de muerte",
  "un-crc-opac": "Protocolo facultativo · niños en conflictos armados",
  "un-crc-opsc": "Protocolo facultativo · venta de niños, prostitución y pornografía infantil",
  "un-crc-opic": "Protocolo facultativo · procedimiento de comunicaciones",
};
