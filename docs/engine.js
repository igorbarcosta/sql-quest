import { players, matches } from './game-data.js';

export async function createDatabase(initSqlJs, wasmUrl) {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database();
  db.run('CREATE TABLE jogadores (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, classe TEXT NOT NULL, cidade TEXT NOT NULL)');
  db.run('CREATE TABLE partidas (id INTEGER PRIMARY KEY, jogador_id INTEGER NOT NULL, mapa TEXT NOT NULL, pontos INTEGER NOT NULL)');
  const playerInsert = db.prepare('INSERT INTO jogadores VALUES (?, ?, ?, ?)');
  players.forEach(row => playerInsert.run(row));
  playerInsert.free();
  const matchInsert = db.prepare('INSERT INTO partidas VALUES (?, ?, ?, ?)');
  matches.forEach(row => matchInsert.run(row));
  matchInsert.free();
  db.run('PRAGMA query_only = ON');
  return db;
}

// Scans SQL without mistaking semicolons or forbidden words inside quoted text for code.
export function inspectSql(sql) {
  let cleaned = '';
  let state = 'code';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i], next = sql[i + 1];
    if (state === 'line') {
      if (ch === '\n') { state = 'code'; cleaned += '\n'; }
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; i++; }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'backtick') {
      const end = { single: "'", double: '"', backtick: '`' }[state];
      if (ch === end && next === end) { i++; continue; }
      if (ch === end) state = 'code';
      continue;
    }
    if (state === 'bracket') { if (ch === ']') state = 'code'; continue; }
    if (ch === '-' && next === '-') { state = 'line'; cleaned += ' '; i++; continue; }
    if (ch === '/' && next === '*') { state = 'block'; cleaned += ' '; i++; continue; }
    if (ch === "'") { state = 'single'; cleaned += ' '; continue; }
    if (ch === '"') { state = 'double'; cleaned += ' '; continue; }
    if (ch === '`') { state = 'backtick'; cleaned += ' '; continue; }
    if (ch === '[') { state = 'bracket'; cleaned += ' '; continue; }
    if (ch === ';') { cleaned += ';'; continue; }
    cleaned += ch;
  }
  const parts = cleaned.split(';');
  if (parts.slice(1).some(part => part.trim())) return { ok: false, message: 'Envie apenas uma instrução SQL por tentativa.' };
  const code = parts[0].trim();
  if (!code) return { ok: false, message: 'Escreva uma consulta para começar.' };
  if (!/^SELECT\b/i.test(code)) return { ok: false, message: 'Nesta revisão, use apenas consultas que começam com SELECT.' };
  if (/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|ATTACH|DETACH|REPLACE|VACUUM|REINDEX)\b/i.test(code)) {
    return { ok: false, message: 'Esta operação não é permitida. Use somente uma consulta de leitura.' };
  }
  if (state === 'block') return { ok: false, message: 'Há um comentário sem fechamento na consulta.' };
  return { ok: true };
}

export function executeQuery(db, sql) {
  const inspection = inspectSql(sql);
  if (!inspection.ok) return { error: inspection.message, prohibited: true };
  try {
    const result = db.exec(sql);
    return result.length ? { columns: result[0].columns, rows: result[0].values } : { columns: [], rows: [] };
  } catch (error) {
    return { error: `O SQLite não conseguiu executar sua consulta.\n${error.message}` };
  }
}

function equalValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  return a === b;
}
function equalRow(a, b) { return a.length === b.length && a.every((value, index) => equalValue(value, b[index])); }

export function compareResults(actual, target) {
  if (actual.error) return { ok: false, kind: 'error', message: actual.error };
  if (actual.columns.length !== target.columns.length || actual.columns.some((name, i) => name !== target.columns[i])) {
    return { ok: false, kind: 'columns', message: `Sua saída tem as colunas: ${actual.columns.join(', ') || '(nenhuma)'}.\nA saída-alvo tem: ${target.columns.join(', ')}.` };
  }
  if (actual.rows.length !== target.rows.length) {
    return { ok: false, kind: 'count', message: `Sua consulta retornou ${actual.rows.length} ${actual.rows.length === 1 ? 'linha' : 'linhas'}.\nA saída-alvo possui ${target.rows.length}.` };
  }
  if (actual.rows.every((row, i) => equalRow(row, target.rows[i]))) return { ok: true, kind: 'correct' };
  const remaining = [...target.rows];
  const sameRows = actual.rows.every(row => {
    const at = remaining.findIndex(candidate => equalRow(row, candidate));
    if (at < 0) return false;
    remaining.splice(at, 1);
    return true;
  });
  if (sameRows) return { ok: false, kind: 'order', message: 'Você encontrou as linhas corretas, mas a ordem ainda está diferente.' };
  return { ok: false, kind: 'values', message: 'A estrutura está próxima. Revise filtros, relações ou cálculos.' };
}
