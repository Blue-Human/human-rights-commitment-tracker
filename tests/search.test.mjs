import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, fold, marks, prepare, queryWords, search, sitePages } from '../src/lib/search.ts';

const index = prepare([
  ...sitePages,
  { kind: 'recommendation', title: 'Convención sobre los trabajadores migratorios', note: 'Recomendación 50.1', href: '/commitments/ESP-UPR4-050.1', text: 'Considerar la posibilidad de ratificar la Convención.' },
  { kind: 'recommendation', title: 'Recursos del Defensor del Pueblo', note: 'Recomendación 50.10', href: '/commitments/ESP-UPR4-050.10', text: 'Dotar al Defensor del Pueblo de recursos suficientes.' },
  { kind: 'recommendation', title: 'Vivienda adecuada para todos', note: 'Recomendación 50.131', href: '/commitments/ESP-UPR4-050.131', text: 'Proporcionar una vivienda adecuada a todos en España.' },
  { kind: 'sdg', title: 'ODS 5 · Igualdad de género', href: '/ods/5', text: 'Lograr la igualdad entre los géneros. Meta 5.2: Eliminar todas las formas de violencia contra todas las mujeres y las niñas.' },
]);
const hrefs = (query, ...rest) => search(index, query, ...rest).flatMap((group) => group.entries.map((entry) => entry.href));

test('folding ignores case and accents and keeps the length of the text', () => {
  assert.equal(fold('España · Género ÁÉÍÓÚ ü'), 'espana · genero aeiou u');
  for (const text of ['Metodología', 'niñas', 'é', '🚨 aviso']) assert.equal(fold(text).length, text.normalize('NFC').length);
});

test('a query is found without its accents, and every word has to match', () => {
  assert.deepEqual(hrefs('metodologia')[0], '/methodology');
  assert.deepEqual(hrefs('igualdad genero'), ['/ods/5']);
  assert.deepEqual(hrefs('vivienda espana'), ['/commitments/ESP-UPR4-050.131']);
  assert.deepEqual(hrefs('vivienda zzz'), []);
  assert.deepEqual(search(index, '   '), []);
});

test('a recommendation number puts the exact one first', () => {
  assert.equal(hrefs('50.1')[0], '/commitments/ESP-UPR4-050.1');
  assert.equal(hrefs('50.10')[0], '/commitments/ESP-UPR4-050.10');
});

test('the text of an entry is searched too: a target of a goal finds the goal', () => {
  assert.deepEqual(hrefs('violencia niñas'), ['/ods/5']);
});

test('every page of the site can be found by its name', () => {
  for (const page of sitePages) assert.ok(hrefs(page.title, 50).includes(page.href), page.title);
});

test('a group is capped, counts all its matches and can be shown whole', () => {
  const [pages] = search(index, 'metodologia', 2);
  assert.equal(pages.kind, 'page');
  assert.equal(pages.entries.length, 2);
  assert.ok(pages.total > 2);
  assert.equal(search(index, 'metodologia', 2, 'page')[0].entries.length, pages.total);
});

test('the excerpt surrounds the match and the marks rebuild the text', () => {
  const text = 'Lograr la igualdad entre los géneros. Meta 5.2: Eliminar todas las formas de violencia contra todas las mujeres y las niñas.';
  const words = queryWords('Niñas');
  assert.match(excerpt(text, words, 20), /^….*niñas\.$/);
  assert.equal(excerpt(text, ['zzz'], 10), 'Lograr la igualdad…');
  const parts = marks(text, words);
  assert.equal(parts.map((part) => part.text).join(''), text);
  assert.deepEqual(parts.filter((part) => part.hit).map((part) => part.text), ['niñas']);
});
