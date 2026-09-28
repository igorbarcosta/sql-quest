import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { players, matches, phases, boss } from '../docs/game-data.js';
import { createDatabase, executeQuery, compareResults, inspectSql } from '../docs/engine.js';

const require = createRequire(import.meta.url);
const initSqlJs = require('../docs/vendor/sql-wasm.js');
const db = await createDatabase(initSqlJs, new URL('../docs/vendor/sql-wasm.wasm', import.meta.url).pathname);
assert.equal(players.length, 8);
assert.equal(matches.length, 10);
assert.equal(db.exec('SELECT COUNT(*) FROM jogadores')[0].values[0][0], 8);
assert.equal(db.exec('SELECT COUNT(*) FROM partidas')[0].values[0][0], 10);

const reference = readFileSync(new URL('../gabarito-professor.sql', import.meta.url), 'utf8');
const [regularReference, bossReference] = reference.split(/-- CHEFÃO\n/);
const solutions = regularReference.split(/-- Fase \d+\n/).slice(1).map(text => text.trim());
assert.equal(solutions.length, 10);
solutions.forEach((sql, index) => {
  const verdict = compareResults(executeQuery(db, sql), phases[index]);
  assert.equal(verdict.ok, true, `Fase ${index + 1}: ${verdict.message}`);
  console.log(`Fase ${index + 1}: OK`);
});
assert.equal(compareResults(executeQuery(db, bossReference.trim()), boss).ok, true);
console.log('Chefão: OK');
assert.deepEqual(executeQuery(db, solutions[6]).rows, [[10, 4019, 401.9, 45, 1250]]);
assert.deepEqual(executeQuery(db, solutions[7]).rows, [['Vulcão', 2, 1810], ['Ruínas', 3, 1360], ['Arena', 2, 630]]);
assert.deepEqual(executeQuery(db, solutions[8]).rows, [['Ana', 3, 1315], ['Carla', 2, 400], ['Bruno', 2, 395]]);
assert.deepEqual(executeQuery(db, solutions[9]).rows, [['Diego', null], ['Hugo', null]]);
assert.deepEqual(executeQuery(db, bossReference.trim()).rows, [['Ana', 2, 1270], ['Elisa', 1, 1250]]);
const equivalentRange = solutions[1].replace('pontos BETWEEN 150 AND 500', 'pontos >= 150 AND pontos <= 500');
assert.equal(compareResults(executeQuery(db, equivalentRange), phases[1]).ok, true);

const base = phases[0];
assert.equal(compareResults({ columns: ['nome'], rows: base.rows }, base).kind, 'columns');
assert.equal(compareResults({ columns: base.columns, rows: base.rows.slice(1) }, base).kind, 'count');
assert.equal(compareResults({ columns: base.columns, rows: [...base.rows, ['Extra', 'Mago']] }, base).kind, 'count');
assert.equal(compareResults({ columns: base.columns, rows: [...base.rows].reverse() }, base).kind, 'order');
assert.equal(compareResults({ columns: base.columns, rows: [['Outro', 'Mago'], ...base.rows.slice(1)] }, base).kind, 'values');
assert.equal(compareResults(executeQuery(db, 'SELECT FORM jogadores'), base).kind, 'error');
assert.equal(executeQuery(db, 'DELETE FROM partidas').prohibited, true);
assert.equal(executeQuery(db, 'SELECT 1; SELECT 2').prohibited, true);
assert.equal(inspectSql("-- comentário\n SELECT ';' AS valor;").ok, true);
assert.equal(compareResults(executeQuery(db, solutions[9]), phases[9]).ok, true);
assert.equal(compareResults(executeQuery(db, solutions[6]), phases[6]).ok, true);
assert.equal(executeQuery(db, 'SELECT AVG(pontos) FROM partidas').rows[0][0], 401.9);
let blocked = false;
try { db.run('DELETE FROM partidas'); } catch (_) { blocked = true; }
assert.equal(blocked, true, 'SQLite query_only deve bloquear escrita');
console.log('OK: banco (8 + 10), 10 fases, Chefão, alternativa equivalente e validação/segurança.');
