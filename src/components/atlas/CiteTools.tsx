"use client";

import { useState } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import { Button, Stack, Typography } from "@mui/material";

export type CiteData = {
  // Plain reference, as it is copied.
  citation: string;
  // Path on this site ("/rights/instruments/un-iccpr#art-6").
  permalink: string;
  // Only what the source states: an entry is left out when its metadata are missing.
  bib?: { key: string; title: string; organization?: string | null; year?: string | null; date?: string | null; url?: string | null; note?: string | null } | null;
};

function bibtex(b: NonNullable<CiteData["bib"]>) {
  const fields = [["title", `{${b.title}}`], ["organization", b.organization], ["year", b.year], ["url", b.url], ["note", b.note]]
    .filter(([, v]) => v).map(([k, v]) => `  ${k} = {${v}}`);
  return `@misc{${b.key},\n${fields.join(",\n")}\n}\n`;
}

function ris(b: NonNullable<CiteData["bib"]>) {
  const lines = ["TY  - LEGAL", `TI  - ${b.title}`, b.organization && `PB  - ${b.organization}`, b.date && `DA  - ${b.date.replaceAll("-", "/")}`,
    b.year && `PY  - ${b.year}`, b.url && `UR  - ${b.url}`, b.note && `N1  - ${b.note}`, "ER  - "].filter(Boolean);
  return lines.join("\n") + "\n";
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy the reference or the permanent link, and export the reference for a bibliography manager.
export function CiteTools({ data, dense = false }: { data: CiteData; dense?: boolean }) {
  const [done, setDone] = useState<string | null>(null);
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(what);
      setTimeout(() => setDone(null), 2200);
    } catch {
      setDone("error");
    }
  };
  const absolute = () => new URL(data.permalink, window.location.origin).toString();
  const size = dense ? "small" : "medium";
  return (
    <Stack direction="row" spacing={.5} flexWrap="wrap" useFlexGap alignItems="center">
      <Button size={size} startIcon={<ContentCopyRoundedIcon />} onClick={() => copy("cita", `${data.citation} ${absolute()}`)}>Copiar cita</Button>
      <Button size={size} startIcon={<LinkRoundedIcon />} onClick={() => copy("enlace", absolute())}>Copiar enlace</Button>
      {data.bib && (
        <>
          <Button size={size} startIcon={<DownloadRoundedIcon />} onClick={() => download(`${data.bib!.key}.bib`, bibtex(data.bib!), "application/x-bibtex")}>BibTeX</Button>
          <Button size={size} startIcon={<DownloadRoundedIcon />} onClick={() => download(`${data.bib!.key}.ris`, ris(data.bib!), "application/x-research-info-systems")}>RIS</Button>
        </>
      )}
      <Typography role="status" variant="caption" color={done === "error" ? "error" : "text.secondary"} sx={{ minWidth: 80 }}>
        {done === "error" ? "No se ha podido copiar." : done ? `Se ha copiado ${done === "cita" ? "la cita" : "el enlace"}.` : ""}
      </Typography>
    </Stack>
  );
}
