import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { CiteTools } from "@/components/atlas/CiteTools";
import { Facts, type Fact } from "@/components/atlas/Facts";
import { ExternalLink, Pill, SourceNote } from "@/components/atlas/Quote";
import { ReaderSearch } from "@/components/atlas/ReaderSearch";
import { TextIndex, TextReader } from "@/components/atlas/TextReader";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { getInstrument, getInstruments, getInterpretations, getParticipation, getText } from "@/lib/atlas/data";
import {
  authorityNames, authorityNotes, bodyPath, cellLabel, checkNames, consentTypes, countryPath, instrumentPath, instrumentTitle, kindNames, kindNotes,
  longDate, partiesLine, procedurePath, shortDate, statusNames, systemNames, year,
} from "@/lib/atlas/labels";
import { articleContext, bodiesOf, proceduresCiting } from "@/lib/atlas/relations";
import type { Instrument, Participant } from "@/lib/atlas/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getInstruments()).map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const instrument = await getInstrument((await params).id);
  if (!instrument) return {};
  return {
    title: `${instrumentTitle(instrument)} | Human Rights Atlas`,
    description: `${kindNames[instrument.kind]} · ${systemNames[instrument.system]}. Texto, estado de ratificación, reservas y órganos de supervisión, con la fuente oficial de cada dato.`,
  };
}

function registryLinks(i: Instrument): { label: string; href: string }[] {
  const r = i.registry as Record<string, string>;
  const links: { label: string; href: string }[] = [];
  if (r.untc_url) links.push({ label: `Colección de Tratados de la ONU (${r.untc})`, href: r.untc_url });
  if (r.boe) links.push({ label: `BOE · ${r.boe}`, href: `https://www.boe.es/buscar/act.php?id=${r.boe}` });
  if (r.boe_text && r.boe_text !== r.boe) links.push({ label: `BOE · texto consolidado ${r.boe_text}`, href: `https://www.boe.es/buscar/act.php?id=${r.boe_text}` });
  if (r.oas_text_url) links.push({ label: `Texto en el sitio de la OEA (${r.oas})`, href: r.oas_text_url });
  if (r.oas_signatures_url) links.push({ label: "Firmas y ratificaciones (OEA)", href: r.oas_signatures_url });
  if (r.au_url) links.push({ label: "Ficha del tratado (Unión Africana)", href: r.au_url });
  if (r.au_status_list) links.push({ label: "Lista de firmas y ratificaciones (Unión Africana)", href: r.au_status_list });
  if (r.undocs_url) links.push({ label: `Documento oficial ${r.un_symbol} (documents.un.org)`, href: r.undocs_url });
  if (r.url) links.push({ label: "Documento en el sitio del órgano", href: r.url });
  return links;
}

function consentCell(p: Participant) {
  if (!p.consent) return "—";
  const type = p.consent.type ? consentTypes[p.consent.type] || p.consent.type : "";
  return `${shortDate(p.consent.date)}${type ? ` · ${type}` : ""}${p.consent.code ? ` (${p.consent.code})` : ""}`;
}

export default async function InstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instrument = await getInstrument(id);
  if (!instrument) notFound();
  const all = await getInstruments();
  const byId = new Map(all.map((i) => [i.id, i]));
  const readable = instrument.texts.find((t) => t.complete && t.lang === "es") || instrument.texts.find((t) => t.complete);
  const [text, participation, interpretations, bodies, procedures, context] = await Promise.all([
    readable ? getText(id, readable.lang) : null, getParticipation(id), getInterpretations(), bodiesOf(id), proceduresCiting(id), articleContext(id),
  ]);
  const own = interpretations.filter((g) => g.instrument === id);
  const parent = instrument.parent ? byId.get(instrument.parent) : null;
  const children = (instrument.children.map((c) => byId.get(c)).filter(Boolean) as Instrument[])
    .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }));
  const otherLangs = instrument.texts.filter((t) => t.complete && t !== readable);
  const failing = instrument.texts.filter((t) => !t.complete);

  const facts: Fact[] = [];
  if (instrument.concluded || instrument.done_es || instrument.concluded_text) {
    facts.push({
      label: instrument.system === "au" ? "Adopción" : "Adopción o apertura a la firma",
      value: instrument.concluded ? longDate(instrument.concluded) : instrument.done_es,
      note: <SourceNote label={instrument.system === "un" ? "registro del depositario (UNTC)" : instrument.system === "oas" ? "OEA" : instrument.system === "au" ? "Unión Africana" : "BOE"}>
        {instrument.concluded_text ? ` · ${instrument.concluded_text}` : ""}{instrument.concluded_precision === "month" ? " · la Unión Africana registra solo el mes" : ""}{instrument.done_es && instrument.concluded ? ` · ${instrument.done_es}` : ""}
      </SourceNote>,
    });
  }
  if (instrument.entry_into_force?.date || instrument.entry_into_force?.text) {
    facts.push({ label: "Entrada en vigor", value: longDate(instrument.entry_into_force.date) || "Sin fecha en el registro",
      note: <SourceNote label={instrument.entry_into_force.ref?.source === "boe" ? "nota del BOE" : "registro del depositario"} href={instrument.entry_into_force.ref?.url} retrieved={instrument.entry_into_force.ref?.retrieved}>{instrument.entry_into_force.text && instrument.entry_into_force.ref?.source !== "boe" ? ` · «${instrument.entry_into_force.text}»` : ""}</SourceNote> });
  }
  if (instrument.status && instrument.status.parties !== null) {
    facts.push({ label: instrument.status.counted ? "Ratificaciones o adhesiones en la tabla" : "Estados Partes", value: `${instrument.status.parties}${instrument.status.signatories !== null && !instrument.status.counted ? ` · ${instrument.status.signatories} signatarios` : ""}`,
      note: <SourceNote label="registro del depositario" href={instrument.status.ref.url} retrieved={instrument.status.ref.retrieved}>{instrument.status.as_of ? ` · estado a ${shortDate(instrument.status.as_of)}` : ""}{instrument.status.counted ? " · recuento de la tabla publicada, sin descontar denuncias" : ""}</SourceNote> });
  }
  if (instrument.depositary) facts.push({ label: "Depositario", value: instrument.depositary });
  if (instrument.council_number) facts.push({ label: "Número del Consejo de Europa", value: instrument.council_number, note: <SourceNote label="título publicado en el BOE" /> });
  if (instrument.spain_boe) {
    facts.push({ label: "España", value: [instrument.spain_boe.instrument_type && consentTypes[instrument.spain_boe.instrument_type], instrument.spain_boe.entry_into_force && `en vigor para España desde el ${longDate(instrument.spain_boe.entry_into_force)}`].filter(Boolean).join(" · ") || "Publicado en el BOE",
      note: <SourceNote label={instrument.spain_boe.boe} href={instrument.spain_boe.url}>{instrument.spain_boe.note ? <Box component="span" sx={{ display: "block", mt: .5 }}>«{instrument.spain_boe.note}»</Box> : null}</SourceNote> });
  }

  const statusCounts = new Map<string, number>();
  for (const p of participation?.participants || []) if (p.listed !== false && p.status) statusCounts.set(p.status.code, (statusCounts.get(p.status.code) || 0) + 1);
  const title = instrumentTitle(instrument);

  return (
    <AtlasShell crumbs={[{ label: "Instrumentos", href: "/atlas/instruments" }, { label: title.length > 60 ? `${title.slice(0, 57)}…` : title }]}>
      <PageHead overline={`${systemNames[instrument.system]} · ${kindNames[instrument.kind]}`} title={title}>
        {instrument.popular_name_es && <p>«{instrument.popular_name_es}»</p>}
        {instrument.title_es && instrument.title_en && instrument.system !== "oas" && <p lang="en">{instrument.title_en}</p>}
        {kindNotes[instrument.kind] && <p>{kindNotes[instrument.kind]}</p>}
        {parent && <p>Instrumento de: <Link href={instrumentPath(parent.id)}>{instrumentTitle(parent)}</Link></p>}
        {instrument.title_es_note && <Typography variant="caption" component="p" color="text.secondary">{instrument.title_es_note}</Typography>}
      </PageHead>

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {facts.length > 0 && <Facts facts={facts} columns={3} />}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 2.5 }}>
          {bodies.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary">Órganos</Typography>
              {bodies.map((b) => <Typography key={b.id} variant="body2"><Link href={bodyPath(b.id)}>{b.name_es}</Link></Typography>)}
            </Box>
          )}
          {children.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary">Protocolos y enmiendas</Typography>
              {children.map((c) => <Typography key={c.id} variant="body2"><Link href={instrumentPath(c.id)}>{instrumentTitle(c)}</Link> <Typography component="span" variant="caption" color="text.secondary">({kindNames[c.kind]}{c.entry_into_force?.date ? `, en vigor desde ${year(c.entry_into_force.date)}` : c.kind === "amendment" ? ", sin entrada en vigor registrada" : ""})</Typography></Typography>)}
            </Box>
          )}
          <Box>
            <Typography variant="overline" color="text.secondary">Fuentes oficiales</Typography>
            {registryLinks(instrument).map((l) => <Typography key={l.href} variant="body2"><ExternalLink href={l.href}>{l.label}</ExternalLink></Typography>)}
          </Box>
        </Box>
        <Box sx={{ mt: 2.5 }}>
          <CiteTools data={{
            citation: `${title}${instrument.concluded ? `, ${longDate(instrument.concluded)}` : instrument.done_es ? `, ${instrument.done_es}` : ""}.${partiesLine(instrument) ? ` ${partiesLine(instrument)}.` : ""} Human Rights Atlas (HRCI).`,
            permalink: instrumentPath(id),
            bib: { key: id, title, organization: instrument.depositary || systemNames[instrument.system], year: year(instrument.concluded), date: instrument.concluded, url: registryLinks(instrument)[0]?.href, note: kindNames[instrument.kind] },
          }} />
        </Box>
      </Container>

      <Section id="texto" overline="Texto" title={text ? "Texto oficial" : "Texto"}>
        {text && readable ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "240px minmax(0,1fr)" }, columnGap: 5 }}>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Box sx={{ position: "sticky", top: 84, maxHeight: "calc(100vh - 100px)", overflowY: "auto", pr: 1 }}>
                <ReaderSearch container="reader" />
                <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1 }}>Índice</Typography>
                <TextIndex text={text} />
              </Box>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ p: 2, mb: 3, bgcolor: brand.soft, borderLeft: `3px solid ${brand.accent}` }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>{authorityNames[readable.authority]}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .25, lineHeight: 1.6 }}>{authorityNotes[readable.authority]}</Typography>
                <SourceNote label={`${text.source.publisher}${text.source.identifier ? ` · ${text.source.identifier}` : ""}`} href={text.source.url} retrieved={text.source.retrieved}>
                  {text.source.published ? ` · publicado el ${longDate(text.source.published)}` : ""}
                </SourceNote>
                {text.authentic_clause && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .75, lineHeight: 1.6 }}>
                    Cláusula sobre los textos auténticos{text.authentic_clause.article ? ` (art. ${text.authentic_clause.article})` : ""}: «{text.authentic_clause.text}»
                  </Typography>
                )}
                {otherLangs.map((t) => <Typography key={t.lang} variant="body2" sx={{ mt: 1 }}><Link href={`${instrumentPath(id)}/text/${t.lang}`}>Leer la versión en {t.lang === "en" ? "inglés" : t.lang === "fr" ? "francés" : t.lang}</Link> ({authorityNames[t.authority].toLowerCase()})</Typography>)}
              </Box>
              <Box sx={{ display: { md: "none" }, mb: 2 }}>
                <ReaderSearch container="reader" />
                <Box component="details" sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", "& > summary": { cursor: "pointer", py: 1.5, fontWeight: 500, color: "primary.main" } }}>
                  <summary>Índice</summary>
                  <TextIndex text={text} />
                </Box>
              </Box>
              <TextReader text={text} instrument={id} context={context} />
              {text.pending_review && <Typography variant="body2" sx={{ mt: 2, color: "#7a5600" }}>La fuente ha cambiado el texto de {text.pending_review.articles.length} disposiciones el {longDate(text.pending_review.since)}; se muestra la versión anterior hasta que el cambio se verifique.</Typography>}
              <Box sx={{ mt: 4 }}>
                <RecordDisclosure title="Controles de integridad del texto">
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {text.quality.checks.map((c) => <li key={c.check}><Typography variant="body2">{c.ok ? "✓" : "✗"} {checkNames[c.check] || c.check}{c.detail ? ` — ${c.detail}` : ""}{c.exceptions?.map((e) => ` · Excepción documentada (art. ${e.article}): ${e.reason}`).join("")}</Typography></li>)}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Método de extracción: {text.source.method}. Huella SHA-256 del documento: {text.source.sha256?.slice(0, 16)}…</Typography>
                </RecordDisclosure>
                {text.spain_instrument && text.spain_instrument.length > 0 && (
                  <RecordDisclosure title="Instrumento de España publicado en el BOE (no forma parte del tratado)">
                    {text.spain_instrument.map((p, i) => <Typography key={i} variant="body2" sx={{ my: .75, lineHeight: 1.65 }}>{p}</Typography>)}
                  </RecordDisclosure>
                )}
                {text.publication_notes && text.publication_notes.length > 0 && (
                  <RecordDisclosure title="Notas de la publicación oficial" count={text.publication_notes.length}>
                    {text.publication_notes.slice(0, 120).map((p, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ my: .75, lineHeight: 1.6 }}>{p}</Typography>)}
                  </RecordDisclosure>
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 820 }}>
            <Typography sx={{ lineHeight: 1.75 }}>
              El articulado de este instrumento no se ofrece en el lector: {failing.length
                ? "la única versión digital oficial localizada no supera los controles de integridad del Atlas, y publicarla como texto completo podría inducir a error."
                : "no se ha localizado una versión digital oficial que pueda extraerse con fiabilidad."} Consulte el texto en las fuentes oficiales enlazadas arriba.
            </Typography>
            {failing.map((t) => (
              <Box key={t.lang} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">{t.publisher}{t.identifier ? ` · ${t.identifier}` : ""}: <ExternalLink href={t.url}>ver el original</ExternalLink></Typography>
                <Box component="ul" sx={{ m: 0, mt: .5, pl: 2.5 }}>{t.checks.filter((c) => !c.ok).map((c) => <li key={c.check}><Typography variant="body2" color="text.secondary">{checkNames[c.check] || c.check}{c.detail ? `: ${c.detail}` : ""}</Typography></li>)}</Box>
              </Box>
            ))}
          </Box>
        )}
      </Section>

      {participation && (
        <Section id="participacion" overline="Estados" title="Participación" note={<>{participation.legend} <Link href={`/atlas/ratifications?i=${id}`}>Ver el mapa de ratificaciones</Link>.</>}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {[...statusCounts.entries()].map(([code, n]) => <Pill key={code}>{statusNames[code as keyof typeof statusNames] || code}: {n}</Pill>)}
          </Box>
          <SourceNote label="registro del depositario" href={participation.ref.url} retrieved={participation.ref.retrieved}>{participation.as_of ? ` · estado a ${shortDate(participation.as_of)}` : ""}</SourceNote>
          <Box sx={{ mt: 2 }}>
            <RecordDisclosure title="Tabla de participantes" count={participation.participants.filter((p) => p.listed !== false).length}>
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem", "& th, & td": { textAlign: "left", p: .75, borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top" }, "& th": { color: "text.secondary", fontWeight: 600 } }}>
                  <thead><tr><th scope="col">Participante</th><th scope="col">Firma</th><th scope="col">Consentimiento</th><th scope="col">Entrada en vigor (ACNUDH)</th><th scope="col">Reservas y declaraciones</th><th scope="col">Situación en el registro</th></tr></thead>
                  <tbody>
                    {participation.participants.filter((p) => p.listed !== false).map((p) => (
                      <tr key={p.name}>
                        <th scope="row" style={{ fontWeight: 500 }}>{p.iso3 ? <Link href={`${countryPath(p.iso3)}#${id}`}>{p.name}</Link> : p.name}</th>
                        <td>{p.signature ? shortDate(p.signature) : "—"}{p.signature_bracketed ? " [ ]" : ""}</td>
                        <td>{consentCell(p)}{p.consent?.bracketed ? " [ ]" : ""}</td>
                        <td>{p.ohchr?.entry_into_force ? shortDate(p.ohchr.entry_into_force) : "—"}</td>
                        <td>{p.statements.filter((s) => s.section === "Dec" || s.section === "oas").length || "—"}</td>
                        <td>{p.status ? cellLabel({ s: p.status.code, d: p.status.date, t: p.status.type }) : "—"}{p.ohchr?.denunciation ? ` · denuncia ${shortDate(p.ohchr.denunciation)}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Las fechas de entrada en vigor por Estado proceden de la base de datos de órganos de tratados del ACNUDH; el registro del depositario no las publica. [ ] indica una entrada entre corchetes en el registro.</Typography>
            </RecordDisclosure>
          </Box>
        </Section>
      )}

      {(own.length > 0 || procedures.length > 0) && (
        <Section id="relacionado" overline="Relacionado" title="Interpretaciones y procedimientos">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, columnGap: 6, rowGap: 4 }}>
            {own.length > 0 && (
              <Box>
                <Typography variant="h6" component="h3" color="primary.main">Observaciones y recomendaciones generales ({own.length})</Typography>
                <Box component="ul" sx={{ m: 0, mt: 1, p: 0, listStyle: "none" }}>
                  {own.slice(0, 12).map((g) => <Box component="li" key={g.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}><Typography variant="body2"><ExternalLink href={g.links.es}>{g.symbol}</ExternalLink> · {g.title}</Typography></Box>)}
                </Box>
                {own.length > 12 && <Typography variant="body2" sx={{ mt: 1 }}><Link href={`/atlas/case-law?committee=${own[0].committee}`}>Ver las {own.length}</Link></Typography>}
              </Box>
            )}
            {procedures.length > 0 && (
              <Box>
                <Typography variant="h6" component="h3" color="primary.main">Procedimientos que se basan en este instrumento</Typography>
                <Box component="ul" sx={{ m: 0, mt: 1, p: 0, listStyle: "none" }}>
                  {procedures.map((p) => <Box component="li" key={p.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}><Typography variant="body2"><Link href={procedurePath(p.id)}>{p.name_es}</Link></Typography></Box>)}
                </Box>
              </Box>
            )}
          </Box>
        </Section>
      )}
    </AtlasShell>
  );
}
