import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { Dot, ExternalLink, SourceNote } from "@/components/atlas/Quote";
import { Figure } from "@/components/Figure";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { getAcceptance, getBodies, getCountries, getCountry, getDecisions, getInstruments, getMatrix, getParticipation, getProcedureStatus, getProcedures } from "@/lib/atlas/data";
import {
  acceptanceNames, acceptanceTones, cellLabel, cellStatus, instrumentPath, instrumentTitle, kindNames, procedurePath, shortDate,
  statusNames, statusNotes, statusTones, systemNames, systemOrder,
} from "@/lib/atlas/labels";
import type { Instrument, MatrixCell } from "@/lib/atlas/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getCountries()).map((c) => ({ iso3: c.iso3.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }): Promise<Metadata> {
  const country = await getCountry((await params).iso3);
  return country ? {
    title: `${country.name_es || country.name_en} | Human Rights Atlas`,
    description: `Tratados de derechos humanos firmados, ratificados o a los que se ha adherido ${country.name_es || country.name_en}, sus reservas y declaraciones y los procedimientos que ha aceptado, según los registros oficiales.`,
  } : {};
}

function StatusCell({ cell }: { cell?: MatrixCell }) {
  const code = cellStatus(cell);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: .75 }}>
      <Dot color={statusTones[code]} />
      <span>{cellLabel(cell)}</span>
    </Box>
  );
}

export default async function CountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const country = await getCountry((await params).iso3);
  if (!country) notFound();
  const iso3 = country.iso3;
  const [instruments, matrix, acceptance, procedures, status, bodies, decisions] = await Promise.all([
    getInstruments(), getMatrix(), getAcceptance(), getProcedures(), getProcedureStatus(), getBodies(), getDecisions(),
  ]);
  const cells = matrix.states[iso3] || {};
  const name = country.name_es || country.name_en;
  const withRegister = instruments.filter((i) => i.status || cells[i.id]);
  const core = instruments.filter((i) => i.category === "core" && i.kind !== "declaration" && i.kind !== "amendment");
  const consented = core.filter((i) => cells[i.id]?.s === "consent").length;
  const signedOnly = core.filter((i) => cells[i.id]?.s === "signature").length;
  const accepted = (acceptance[iso3]?.procedures || []).filter((p) => p.accepted === true);
  const participations = await Promise.all(withRegister.filter((i) => cells[i.id]).map(async (i) => ({ i, p: await getParticipation(i.id) })));
  const statementsByInstrument = participations.map(({ i, p }) => {
    const entry = p?.participants.find((x) => x.iso3 === iso3);
    const notes = (entry?.notes || []).map((n) => ({ n, text: p?.notes?.[n] })).filter((x) => x.text);
    return { i, entry, notes, register: p };
  }).filter((x) => x.entry && (x.entry.statements.length || x.notes.length));
  const judge = bodies.find((b) => b.id === "coe-ecthr")?.members;
  const ecthrJudge = judge?.members.find((m) => m.state === country.name_en);
  const achprMember = bodies.find((b) => b.id === "au-achpr-commission")?.members?.members.find((m) => m.state === country.name_en);
  const spainDecisions = decisions.items.filter((d) => d.states.includes(iso3));

  const bySystem = systemOrder.map((system) => ({ system, rows: instruments.filter((i) => i.system === system && i.category !== "procedural" && i.kind !== "declaration" && (i.status || cells[i.id] || system === "coe")) }))
    .filter((g) => g.rows.length);

  return (
    <AtlasShell crumbs={[{ label: "Países", href: "/rights/countries" }, { label: name }]}>
      <PageHead overline={[country.region_es, country.subregion_es].filter(Boolean).join(" · ") || "Estado"} title={name}>
        {country.name_es && <p lang="en">{country.name_en}</p>}
        <p><Link href={`/rights/compare?c=${iso3}`}>Comparar con otros Estados</Link> · <Link href={`/rights/mechanisms/guide?pais=${iso3}`}>Orientador de mecanismos para este Estado</Link></p>
      </PageHead>

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3, pt: 3, borderTop: "2px solid", borderColor: "secondary.main" }}>
          <Figure value={String(consented)} of={`de ${core.length}`}>tratados y protocolos fundamentales de la ONU con consentimiento registrado</Figure>
          <Figure value={String(signedOnly)}>firmados sin ratificación</Figure>
          <Figure value={String(accepted.length)}>procedimientos de órganos de tratados aceptados (ACNUDH)</Figure>
          <Figure value={String(spainDecisions.length)}>decisiones de comités de la ONU sobre este Estado incorporadas</Figure>
        </Box>
        {iso3 === "ESP" && (
          <Box sx={{ mt: 3, p: 2, bgcolor: brand.soft, borderLeft: `3px solid ${brand.accent}` }}>
            <Typography variant="body2">Compromisos y recomendaciones: el HRCI hace el seguimiento de las <Link href="/commitments">recomendaciones del cuarto ciclo del Examen Periódico Universal</Link> dirigidas a España, con la respuesta del Estado y la valoración de su cumplimiento.</Typography>
          </Box>
        )}
      </Container>

      <Section id="tratados" overline="Registros de los depositarios" title="Tratados" note={<>Situación de cada instrumento según el registro de su depositario. «Sin actuación registrada» significa que el registro no recoge ningún acto de este Estado; no equivale a una firma pendiente.</>}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
          {(["consent", "signature", "denounced", "bracketed", "consent_boe", "none"] as const).map((c) => <Box key={c} sx={{ display: "flex", alignItems: "center", gap: .75 }}><Dot color={statusTones[c]} /><Typography variant="caption" title={statusNotes[c]}>{statusNames[c]}</Typography></Box>)}
        </Box>
        {bySystem.map(({ system, rows }) => (
          <Box key={system} sx={{ mt: 3 }}>
            <Typography component="h3" variant="h6" color="primary.main">{systemNames[system]}</Typography>
            {system === "coe" && !rows.some((i) => cells[i.id]) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>La Oficina de Tratados del Consejo de Europa no permite la consulta automatizada de su registro, por lo que el Atlas no muestra la situación de este Estado en esos convenios. Consúltese en <ExternalLink href="https://www.coe.int/es/web/conventions">coe.int/conventions</ExternalLink>.</Typography>
            )}
            {(system !== "coe" || rows.some((i) => cells[i.id])) && (
              <Box sx={{ overflowX: "auto", mt: 1 }}>
                <Box component="table" sx={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: ".875rem", "& th, & td": { textAlign: "left", p: .9, borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top" }, "& thead th": { color: "text.secondary", fontWeight: 600, fontSize: ".78rem" } }}>
                  <thead><tr><th scope="col">Instrumento</th><th scope="col">Situación</th><th scope="col">Fecha</th><th scope="col">Entrada en vigor para el Estado</th><th scope="col">Reservas / declaraciones</th></tr></thead>
                  <tbody>
                    {rows.map((i: Instrument) => {
                      const cell = cells[i.id];
                      return (
                        <tr key={i.id} id={i.id}>
                          <th scope="row" style={{ fontWeight: 500 }}><Link href={instrumentPath(i.id)}>{instrumentTitle(i)}</Link><Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block" }}>{kindNames[i.kind]}</Typography></th>
                          <td><StatusCell cell={cell} /></td>
                          <td>{cell?.d ? shortDate(cell.d) : "—"}</td>
                          <td>{cell?.eif ? `${shortDate(cell.eif)}${cell.s === "consent_boe" ? " (BOE)" : " (ACNUDH)"}` : "—"}</td>
                          <td>{cell?.r || cell?.dc ? `${cell.r || 0} / ${cell.dc || 0}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Box>
              </Box>
            )}
          </Box>
        ))}
        <Box sx={{ mt: 2 }}><SourceNote label="Colección de Tratados de la ONU, base de datos de órganos de tratados del ACNUDH, OEA, Unión Africana y, para España en los convenios del Consejo de Europa, BOE" /></Box>
      </Section>

      <Section id="procedimientos" overline="Competencias aceptadas" title="Procedimientos de los órganos de tratados" note="Aceptación de los procedimientos de comunicaciones individuales, de investigación y de comunicaciones entre Estados según la base de datos de órganos de tratados del ACNUDH. Ser parte en un tratado no implica aceptar sus procedimientos: cada uno requiere su propio acto.">
        {acceptance[iso3] ? (
          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: ".875rem", "& th, & td": { textAlign: "left", p: .9, borderBottom: "1px solid", borderColor: "divider" }, "& thead th": { color: "text.secondary", fontWeight: 600, fontSize: ".78rem" } }}>
              <thead><tr><th scope="col">Procedimiento</th><th scope="col">Tipo</th><th scope="col">Aceptación</th><th scope="col">Fecha</th></tr></thead>
              <tbody>
                {acceptance[iso3].procedures.map((p) => (
                  <tr key={p.kind + p.code}>
                    <th scope="row" style={{ fontWeight: 500 }}>{p.name_es} <Typography component="span" variant="caption" color="text.secondary">({p.code})</Typography></th>
                    <td>{p.kind === "individual" ? "Comunicaciones individuales" : p.kind === "inquiry" ? "Investigación" : "Entre Estados"}</td>
                    <td>{p.accepted === true ? "Sí" : p.accepted === false ? "No" : p.raw || "Sin dato"}</td>
                    <td>{p.date ? shortDate(p.date) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
            <Box sx={{ mt: 1.5 }}><SourceNote label="base de datos de órganos de tratados del ACNUDH" href={acceptance[iso3].ref.url} retrieved={acceptance[iso3].ref.retrieved} /></Box>
          </Box>
        ) : <Typography variant="body2" color="text.secondary">La base de datos del ACNUDH no publica datos de procedimientos para este Estado.</Typography>}
      </Section>

      <Section id="mecanismos" overline="Mecanismos" title="Vías de protección según los registros" note="Qué dicen los registros oficiales sobre cada procedimiento respecto de este Estado. «Requiere verificación» indica que el Atlas no dispone del dato o que el registro contiene información que debe leerse en la fuente.">
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", borderTop: "1px solid", borderColor: "divider" }}>
          {procedures.map((p) => {
            const s = status.procedures[p.id]?.[iso3];
            if (!s) return null;
            return (
              <Box component="li" key={p.id} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "minmax(0,1fr) 210px" }, columnGap: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
                <Box><Typography variant="body2" sx={{ fontWeight: 500 }}><Link href={procedurePath(p.id)}>{p.name_es}</Link></Typography><Typography variant="caption" color="text.secondary">{s.why}{s.d ? ` · ${shortDate(s.d)}` : ""}</Typography></Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: .75 }}><Dot color={acceptanceTones[s.s]} /><Typography variant="body2" sx={{ color: acceptanceTones[s.s], fontWeight: 600 }}>{acceptanceNames[s.s]}</Typography></Box>
              </Box>
            );
          })}
        </Box>
      </Section>

      {(ecthrJudge || achprMember) && (
        <Section id="organos" overline="Órganos" title="Miembros vinculados a este Estado">
          {ecthrJudge && <Typography variant="body2">Tribunal Europeo de Derechos Humanos: {ecthrJudge.name} ({ecthrJudge.function}), juez elegido respecto de este Estado según la composición publicada por el Tribunal a {shortDate(judge?.as_at)}.</Typography>}
          {achprMember && <Typography variant="body2" sx={{ mt: 1 }}>Comisión Africana de Derechos Humanos y de los Pueblos: {achprMember.name} ({achprMember.function}).</Typography>}
        </Section>
      )}

      <Section id="reservas" overline="Registros de los depositarios" title="Reservas, declaraciones, objeciones y notas" note="Texto publicado por el depositario (en inglés en la Colección de Tratados de la ONU; en español en la OEA), con los encabezamientos que él mismo usa. Las objeciones son las que este Estado ha formulado a reservas de otros Estados.">
        {statementsByInstrument.length ? statementsByInstrument.map(({ i, entry, notes, register }) => (
          <RecordDisclosure key={i.id} title={instrumentTitle(i)} count={entry!.statements.length + notes.length}>
            {entry!.statements.map((s, k) => (
              <Box key={k} sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">{s.section_title}{s.label ? ` · ${s.label}` : ""}</Typography>
                <Typography variant="body2" lang={register?.register === "untc" ? "en" : "es"} sx={{ whiteSpace: "pre-line", lineHeight: 1.65 }}>{s.text}</Typography>
              </Box>
            ))}
            {notes.map(({ n, text }) => (
              <Box key={n} sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Nota {n} del depositario</Typography>
                <Typography variant="body2" lang="en" sx={{ whiteSpace: "pre-line", lineHeight: 1.65 }}>{text}</Typography>
              </Box>
            ))}
            {register && <SourceNote label="registro del depositario" href={register.ref.url} retrieved={register.ref.retrieved} />}
          </RecordDisclosure>
        )) : <Typography variant="body2" color="text.secondary">Los registros incorporados no contienen reservas, declaraciones ni notas de este Estado.</Typography>}
      </Section>
    </AtlasShell>
  );
}
