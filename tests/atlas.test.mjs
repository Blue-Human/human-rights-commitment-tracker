// Integrity of the Human Rights Atlas data (data/atlas) and of the annotation workflow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const dir = new URL('../data/atlas/', import.meta.url);
const read = (file) => JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
const instruments = read('instruments.json').instruments;
const byId = new Map(instruments.map((i) => [i.id, i]));
const fold = (s) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

test('every instrument has an official source and a coherent kind and parent', () => {
  for (const i of instruments) {
    const r = i.registry || {};
    assert.ok(r.untc_url || r.boe || r.oas_text_url || r.au_url || r.undocs_url || r.url || i.texts.length, `${i.id} sin fuente`);
    if (i.parent) assert.ok(byId.has(i.parent), `${i.id}: padre inexistente ${i.parent}`);
    if (['optional_protocol', 'amendment'].includes(i.kind)) assert.ok(i.parent, `${i.id}: protocolo o enmienda sin instrumento principal`);
    if (i.kind === 'optional_protocol') assert.equal(byId.get(i.parent).system, i.system, `${i.id}: protocolo asociado a otro sistema`);
  }
});

test('dates are coherent: adoption before entry into force, signature before consent', () => {
  for (const i of instruments) {
    if (i.concluded && i.entry_into_force?.date) assert.ok(i.concluded.slice(0, 7) <= i.entry_into_force.date.slice(0, 7), `${i.id}: entrada en vigor anterior a la adopción`);
  }
  for (const file of readdirSync(new URL('participation/', dir))) {
    const p = read(`participation/${file}`);
    for (const x of p.participants) {
      // The UN register is checked strictly; the OAS and AU tables are published as they are.
      if (p.register === 'untc' && x.signature && x.consent?.date && !x.consent.bracketed) assert.ok(x.signature <= x.consent.date || x.signature_bracketed, `${p.instrument} ${x.name}: firma posterior al consentimiento`);
    }
  }
});

test('ratification status is never contradictory', () => {
  const matrix = read('matrix.json').states;
  for (const [iso, row] of Object.entries(matrix)) for (const [id, cell] of Object.entries(row)) {
    assert.ok(byId.has(id), `${iso}: instrumento desconocido ${id}`);
    if (cell.s === 'consent') assert.ok(cell.d, `${iso} ${id}: consentimiento sin fecha`);
    if (cell.s === 'signature') assert.equal(cell.t, null, `${iso} ${id}: firma con tipo de consentimiento`);
  }
});

test('published texts pass every integrity check, without duplicate articles and with consecutive numbering', () => {
  for (const file of readdirSync(new URL('texts/', dir))) {
    const t = read(`texts/${file}`);
    assert.ok(t.quality.complete, `${file} publicado sin superar los controles`);
    assert.ok(t.source.url && t.source.sha256 && t.source.retrieved, `${file} sin procedencia completa`);
    const numbers = t.nodes.filter((n) => n.kind === 'article').map((n) => n.number);
    assert.equal(new Set(numbers).size, numbers.length, `${file}: artículos duplicados`);
    const digits = numbers.filter((n) => /^\d+$/.test(n)).map(Number);
    digits.forEach((n, k) => k && assert.equal(n, digits[k - 1] + 1, `${file}: salto de numeración en ${n}`));
    const entry = byId.get(t.instrument).texts.find((x) => x.lang === t.lang);
    assert.ok(entry?.complete, `${file} no figura como completo en el catálogo`);
  }
});

test('incomplete extractions are never published as texts', () => {
  for (const i of instruments) for (const t of i.texts) {
    assert.equal(existsSync(new URL(`texts/${i.id}.${t.lang}.json`, dir)), t.complete, `${i.id}.${t.lang}`);
  }
});

test('every procedural requirement has a verified quotation or is declared unavailable', () => {
  const procedures = read('procedures.json').procedures;
  assert.ok(procedures.length >= 20);
  for (const p of procedures) {
    const refs = ['basis', 'who', 'against', 'requirements', 'deadline', 'interim', 'steps', 'follow_up'].flatMap((k) => p[k]);
    for (const q of refs) {
      assert.ok(!q.error, `${p.id}: ${q.error}`);
      assert.ok(q.quote || q.unavailable, `${p.id}: referencia sin cita ni motivo`);
      if (q.quote && q.x) assert.ok(fold(q.quote).includes(fold(q.x)), `${p.id}: la cita no contiene «${q.x}»`);
    }
    for (const q of p.deadline) assert.ok(q.quote && (q.i || q.doc), `${p.id}: plazo sin referencia normativa`);
  }
  assert.deepEqual(read('report.json').quote_errors || [], []);
});

test('decisions and interpretations are linked to articles only with an explicit basis', () => {
  for (const d of read('decisions.json').items) for (const a of d.articles) {
    assert.ok(['violation', 'no_violation'].includes(a.relation) && a.evidence, `${d.id}: relación sin fundamento`);
  }
  for (const g of read('interpretations.json').items) for (const a of g.articles) {
    assert.equal(a.relation, 'title_names_article');
    assert.ok(a.evidence === g.title, `${g.id}: la evidencia no es el título oficial`);
  }
  for (const r of read('rights.json').rights) for (const a of r.articles) {
    assert.ok(r.phrases.some((p) => fold(a.evidence).includes(fold(p))) || (r.exact || []).some((e) => fold(a.evidence).replace(/[ .]+$/, '') === fold(e)), `${r.id}: vínculo sin la expresión en su base`);
  }
});

test('representative records of each system are present', () => {
  for (const id of ['un-iccpr', 'coe-echr', 'oas-achr', 'au-achpr']) assert.ok(byId.get(id)?.texts.some((t) => t.complete), `${id} sin texto`);
  const esp = read('matrix.json').states.ESP;
  assert.equal(esp['un-iccpr'].s, 'consent');
  assert.equal(esp['un-iccpr'].d, '1977-04-27');
  assert.equal(esp['un-cmw'], undefined, 'España no figura en el registro de la Convención sobre los trabajadores migratorios');
  const accepted = read('acceptance.json').countries.ESP.procedures.find((p) => p.code === 'CCPR-OP1');
  assert.equal(accepted.accepted, true);
  assert.ok(read('countries.json').countries.length > 190);
});

test('annotations: visitors read only published notes and cannot write; publishing needs approval', async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261109_atlas_annotations.sql', import.meta.url), 'utf8'));
  const insert = `insert into atlas_annotations(instrument_id, article, kind, title, body, author_name, sources) values ('un-iccpr','6','academic_note','Nota de prueba','Texto de una nota de prueba aislada.','Autora de prueba','[{"label":"CCPR/C/GC/36"}]') returning id`;
  const { rows: [{ id }] } = await db.query(insert);
  await assert.rejects(db.query(`update atlas_annotations set status='published' where id=$1`, [id]), /Transición no permitida/);
  await db.query(`update atlas_annotations set status='in_review' where id=$1`, [id]);
  await assert.rejects(db.query(`update atlas_annotations set status='approved' where id=$1`, [id]), /atlas_published_needs_approval/);
  await db.query(`update atlas_annotations set status='approved', approved_by='Revisora', approved_at=now() where id=$1`, [id]);
  await db.exec(`set role anon`);
  assert.equal((await db.query(`select * from atlas_public_annotations`)).rows.length, 0, 'una nota aprobada aún no es pública');
  await assert.rejects(db.query(insert), /permission denied/);
  await assert.rejects(db.query(`select * from atlas_annotations`), /permission denied/);
  await db.exec(`reset role`);
  await db.query(`update atlas_annotations set status='published' where id=$1`, [id]);
  await db.exec(`set role anon`);
  const visible = (await db.query(`select * from atlas_public_annotations`)).rows;
  assert.equal(visible.length, 1);
  assert.ok(!('approved_by' in visible[0]) && !('status' in visible[0]), 'la vista pública no expone datos de revisión');
  await db.exec(`reset role`);
  await db.query(`update atlas_annotations set body='Texto modificado de la nota de prueba.' where id=$1`, [id]);
  assert.equal((await db.query(`select status from atlas_annotations where id=$1`, [id])).rows[0].status, 'draft', 'editar una nota publicada la devuelve a borrador');
  assert.ok((await db.query(`select count(*)::int n from atlas_annotation_versions where annotation_id=$1`, [id])).rows[0].n >= 5, 'historial de versiones');
});
