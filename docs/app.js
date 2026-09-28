import { players, matches, phases, boss } from './game-data.js';
import { createDatabase, executeQuery, compareResults } from './engine.js';
import { STORAGE_KEY, LEGACY_KEY, TRANSITION_VIEW, BOSS_VIEW, FINAL_VIEW, freshState, readProgress, writeProgress } from './progress.js';

const $ = id => document.getElementById(id);
let initial = readProgress(localStorage);
let state = initial.state;
let db;

function saveState() { try { writeProgress(localStorage, state); } catch (_) {} }
function unlockedThrough() {
  const firstIncomplete = state.phases.findIndex(phase => !phase.completed);
  return firstIncomplete === -1 ? phases.length : firstIncomplete;
}
function starsText(count) { return '★'.repeat(count) + '☆'.repeat(3 - count); }
function makeTable(columns, rows) {
  const table = document.createElement('table');
  const thead = table.createTHead();
  const header = thead.insertRow();
  columns.forEach(name => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = name; header.append(th); });
  const tbody = table.createTBody();
  rows.forEach(row => { const tr = tbody.insertRow(); row.forEach(value => { const td = tr.insertCell(); td.textContent = value === null ? 'NULL' : String(value); if (value === null) td.className = 'null-cell'; }); });
  return table;
}
function fillTable(container, columns, rows) { container.replaceChildren(makeTable(columns, rows)); }
function setFeedback(message, type) {
  const box = $('feedback');
  box.className = `feedback ${type}`;
  box.textContent = message;
}
function clearFeedback() { $('feedback').className = 'feedback hidden'; $('feedback').textContent = ''; }
function renderNav() {
  const nav = $('phase-nav'); nav.replaceChildren();
  phases.forEach((phase, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'phase-step';
    button.disabled = index > unlockedThrough() && !state.phases[index].completed;
    button.setAttribute('aria-label', `Fase ${index + 1}: ${phase.title}${button.disabled ? ', bloqueada' : state.phases[index].completed ? ', concluída' : ''}`);
    if (index === state.view) button.classList.add('active');
    if (state.phases[index].completed) button.classList.add('done');
    const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span'); label.textContent = phase.title;
    const mark = document.createElement('span'); mark.className = 'step-mark'; mark.textContent = button.disabled ? '🔒' : state.phases[index].completed ? '✓' : index === state.view ? '▶' : '';
    button.append(number, label, mark);
    button.addEventListener('click', () => { state.view = index; saveState(); render(); });
    nav.append(button);
  });
  const bossButton = document.createElement('button');
  bossButton.type = 'button'; bossButton.className = 'phase-step boss-step';
  bossButton.disabled = unlockedThrough() !== phases.length;
  if (state.view === BOSS_VIEW) bossButton.classList.add('active');
  if (state.boss.completed) bossButton.classList.add('done');
  bossButton.setAttribute('aria-label', `Chefão: ${bossButton.disabled ? 'bloqueado' : state.boss.completed ? 'derrotado' : 'desbloqueado'}`);
  const symbol = document.createElement('span'); symbol.textContent = '⚔';
  const label = document.createElement('span'); label.textContent = 'CHEFÃO';
  const mark = document.createElement('span'); mark.className = 'step-mark'; mark.textContent = bossButton.disabled ? '🔒' : state.boss.completed ? '🏆' : state.view === BOSS_VIEW ? '▶' : '';
  bossButton.append(symbol, label, mark);
  bossButton.addEventListener('click', () => { state.view = BOSS_VIEW; saveState(); render(); });
  nav.append(bossButton);
}
function renderHints(index) {
  const isBoss = index === BOSS_VIEW;
  const progress = isBoss ? state.boss : state.phases[index];
  const challenge = isBoss ? boss : phases[index];
  const maxHints = isBoss ? 3 : 2;
  const list = $('hint-list'); list.replaceChildren();
  challenge.hints.slice(0, progress.hints).forEach((hint, i) => {
    const p = document.createElement('p'); p.className = 'hint';
    const strong = document.createElement('strong'); strong.textContent = `Dica ${i + 1}: `;
    p.append(strong, document.createTextNode(hint)); list.append(p);
  });
  $('hint-button').disabled = progress.hints >= maxHints || progress.completed;
  $('hint-button').textContent = progress.hints >= maxHints ? 'Todas as dicas abertas' : progress.completed ? isBoss ? 'Chefão derrotado' : 'Fase concluída' : progress.hints === 0 ? 'Quero uma dica ✦' : `Quero a dica ${progress.hints + 1} ✦`;
}
function renderPhase() {
  const index = state.view, isBoss = index === BOSS_VIEW;
  const phase = isBoss ? boss : phases[index], progress = isBoss ? state.boss : state.phases[index];
  $('phase-screen').classList.remove('hidden'); $('transition-screen').classList.add('hidden'); $('final-screen').classList.add('hidden');
  $('phase-progress').textContent = isBoss ? '⚔ CHEFÃO' : `Fase ${index + 1}/10`;
  $('phase-stars').textContent = isBoss ? progress.completed ? '🏆 DERROTADO' : '⚔ PENDENTE' : starsText(progress.completed ? progress.stars : 3 - progress.hints);
  $('phase-stars').setAttribute('aria-label', isBoss ? progress.completed ? 'Chefão derrotado' : 'Chefão pendente' : `${progress.completed ? progress.stars : 3 - progress.hints} estrelas`);
  $('progress-fill').style.width = `${state.phases.filter(p => p.completed).length * 10}%`;
  $('phase-eyebrow').textContent = isBoss ? '⚔ CHEFÃO' : `FASE ${index + 1} / 10`;
  $('phase-title').textContent = phase.title;
  $('phase-status').textContent = progress.completed ? isBoss ? '🏆 Derrotado' : '✓ Concluída' : isBoss ? '⚔ Pendente' : 'Em andamento';
  $('phase-status').className = `phase-status ${progress.completed ? 'completed' : ''}`;
  $('validate').textContent = isBoss ? 'Validar Chefão →' : 'Validar fase →';
  $('objective').textContent = phase.objective;
  $('target-table').classList.toggle('wide-table', index === 6);
  $('result-table').classList.toggle('wide-table', index === 6);
  fillTable($('target-table'), phase.columns, phase.rows);
  $('sql-editor').value = progress.draft;
  $('result-count').textContent = '';
  $('result-table').innerHTML = '<div class="empty-result">Execute sua consulta para ver o resultado aqui.</div>';
  clearFeedback(); renderHints(index);
  $('lesson-note').classList.toggle('hidden', index !== 8 || !progress.completed);
  $('next-wrap').classList.toggle('hidden', !progress.completed);
  $('next-phase').textContent = isBoss ? 'Ver resultado final →' : index === 9 ? 'Continuar →' : 'Próxima fase →';
}
function renderTransition() {
  $('phase-screen').classList.add('hidden'); $('transition-screen').classList.remove('hidden'); $('final-screen').classList.add('hidden');
  $('phase-progress').textContent = '10/10 fases';
  $('phase-stars').textContent = '⚔ PENDENTE'; $('phase-stars').setAttribute('aria-label', 'Chefão pendente');
  $('progress-fill').style.width = '100%';
}
function renderFinal() {
  $('phase-screen').classList.add('hidden'); $('transition-screen').classList.add('hidden'); $('final-screen').classList.remove('hidden');
  $('phase-progress').textContent = '10/10 fases'; $('phase-stars').textContent = '🏆 DERROTADO'; $('phase-stars').setAttribute('aria-label', 'Chefão derrotado');
  $('progress-fill').style.width = '100%';
  $('final-person').textContent = `${state.name || 'Aluno(a)'} · Turma: ${state.className || 'não informada'}`;
  $('final-stars').textContent = `${state.phases.reduce((sum, phase) => sum + phase.stars, 0)} / 30`;
  const list = $('summary-list'); list.replaceChildren();
  state.phases.forEach((progress, index) => {
    const row = document.createElement('div'); row.className = 'summary-row';
    const title = document.createElement('span'); title.textContent = `Fase ${index + 1} · ${phases[index].title}`;
    const stars = document.createElement('span'); stars.className = 'summary-stars'; stars.textContent = starsText(progress.stars);
    const attempts = document.createElement('span'); attempts.textContent = `${progress.attempts} ${progress.attempts === 1 ? 'tentativa' : 'tentativas'}`;
    row.append(title, stars, attempts); list.append(row);
  });
  const bossRow = document.createElement('div'); bossRow.className = 'summary-row boss-summary';
  const bossTitle = document.createElement('span'); bossTitle.textContent = '⚔ CHEFÃO';
  const bossStatus = document.createElement('span'); bossStatus.textContent = '🏆 Derrotado';
  const bossAttempts = document.createElement('span'); bossAttempts.textContent = `${state.boss.attempts} ${state.boss.attempts === 1 ? 'tentativa' : 'tentativas'}`;
  bossRow.append(bossTitle, bossStatus, bossAttempts); list.append(bossRow);
}
function render() {
  $('start').classList.toggle('hidden', Boolean(state.name || state.className || state.phases.some(p => p.completed) || state.boss.completed));
  $('game').classList.toggle('hidden', !$('start').classList.contains('hidden'));
  if (!$('start').classList.contains('hidden')) return;
  $('student-display').textContent = [state.name, state.className].filter(Boolean).join(' · ') || 'Aluno(a)';
  if (state.view >= TRANSITION_VIEW && unlockedThrough() !== phases.length) state.view = unlockedThrough();
  if (state.view === FINAL_VIEW && !state.boss.completed) state.view = BOSS_VIEW;
  if (state.view < phases.length && state.view > unlockedThrough() && !state.phases[state.view].completed) state.view = unlockedThrough();
  renderNav();
  if (state.view === FINAL_VIEW) renderFinal();
  else if (state.view === TRANSITION_VIEW) renderTransition();
  else renderPhase();
}
function runCurrent(validate) {
  if (!db) { setFeedback('O banco ainda está carregando. Tente novamente em instantes.', 'error'); return; }
  const index = state.view, isBoss = index === BOSS_VIEW;
  const progress = isBoss ? state.boss : state.phases[index];
  const challenge = isBoss ? boss : phases[index];
  progress.draft = $('sql-editor').value; saveState();
  const result = executeQuery(db, progress.draft);
  if (validate) { progress.attempts++; saveState(); }
  if (result.error) {
    $('result-table').replaceChildren(); $('result-count').textContent = '';
    setFeedback(result.error, 'error'); return;
  }
  fillTable($('result-table'), result.columns, result.rows);
  $('result-count').textContent = `${result.rows.length} ${result.rows.length === 1 ? 'linha' : 'linhas'}`;
  if (!validate) { setFeedback('Consulta executada. Compare seu resultado com a saída-alvo.', 'info'); return; }
  const verdict = compareResults(result, challenge);
  if (!verdict.ok) { setFeedback(verdict.message, 'error'); return; }
  progress.completed = true; progress.winning = progress.draft;
  if (!isBoss) progress.stars = 3 - progress.hints;
  if (isBoss && !state.completedAt) state.completedAt = new Date().toISOString();
  saveState(); renderNav(); renderHints(index);
  $('phase-status').textContent = isBoss ? '🏆 Derrotado' : '✓ Concluída'; $('phase-status').className = 'phase-status completed';
  $('phase-stars').textContent = isBoss ? '🏆 DERROTADO' : starsText(progress.stars);
  $('progress-fill').style.width = `${state.phases.filter(p => p.completed).length * 10}%`;
  $('lesson-note').classList.toggle('hidden', index !== 8);
  $('next-wrap').classList.remove('hidden'); $('next-phase').textContent = isBoss ? 'Ver resultado final →' : index === 9 ? 'Continuar →' : 'Próxima fase →';
  setFeedback(isBoss ? '🏆 CHEFÃO DERROTADO\nSua consulta produziu exatamente a saída esperada.' : '✓ FASE CONCLUÍDA\nBoa! Sua consulta produziu exatamente a saída esperada.', 'success');
  $('feedback').classList.add('celebrate'); setTimeout(() => $('feedback').classList.remove('celebrate'), 600);
}
function renderBank(which) {
  const isPlayers = which === 'players';
  $('tab-players').setAttribute('aria-selected', String(isPlayers));
  $('tab-matches').setAttribute('aria-selected', String(!isPlayers));
  const area = $('bank-content'); area.replaceChildren();
  const columns = isPlayers ? ['id', 'nome', 'classe', 'cidade'] : ['id', 'jogador_id', 'mapa', 'pontos'];
  const title = document.createElement('h3'); title.textContent = isPlayers ? 'jogadores' : 'partidas';
  const structure = document.createElement('p'); structure.className = 'bank-structure'; structure.textContent = columns.join('  ·  ');
  const wrap = document.createElement('div'); wrap.className = 'table-wrap'; wrap.append(makeTable(columns, isPlayers ? players : matches));
  area.append(title, structure, wrap);
}
function downloadAnswers() {
  if (!state.phases.every(phase => phase.completed && phase.winning) || !state.boss.completed || !state.boss.winning) return;
  const lines = ['-- SQL Quest — 10 Fases + Chefão', `-- Aluno: ${state.name || 'Não informado'}`, `-- Turma: ${state.className || 'Não informada'}`, `-- Concluído em: ${new Date(state.completedAt || Date.now()).toLocaleString('pt-BR')}`, ''];
  state.phases.forEach((phase, index) => {
    lines.push(`-- Fase ${index + 1}`, `-- Estrelas: ${phase.stars}`, `-- Tentativas: ${phase.attempts}`, '', phase.winning.trim().replace(/;?\s*$/, ';'), '', '');
  });
  lines.push('-- CHEFÃO', '-- Status: derrotado', `-- Tentativas: ${state.boss.attempts}`, '', state.boss.winning.trim().replace(/;?\s*$/, ';'), '');
  const filenamePart = (state.name || 'aluno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'aluno';
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `revisao_sql_${filenamePart}.sql`; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('start-form').addEventListener('submit', event => {
  event.preventDefault(); state.name = $('student-name').value.trim(); state.className = $('student-class').value.trim();
  if (!state.name && !state.className) { $('student-name').focus(); $('student-name').setCustomValidity('Preencha pelo menos seu nome ou sua turma.'); $('student-name').reportValidity(); return; }
  $('student-name').setCustomValidity(''); saveState(); render();
});
$('student-name').addEventListener('input', () => $('student-name').setCustomValidity(''));
$('sql-editor').addEventListener('input', () => { if (state.view < phases.length || state.view === BOSS_VIEW) { (state.view === BOSS_VIEW ? state.boss : state.phases[state.view]).draft = $('sql-editor').value; saveState(); } });
$('execute').addEventListener('click', () => runCurrent(false));
$('validate').addEventListener('click', () => runCurrent(true));
$('hint-button').addEventListener('click', () => { const isBoss = state.view === BOSS_VIEW; const progress = isBoss ? state.boss : state.phases[state.view]; if (progress.hints < (isBoss ? 3 : 2) && !progress.completed) { progress.hints++; saveState(); renderHints(state.view); if (!isBoss) $('phase-stars').textContent = starsText(3 - progress.hints); } });
$('next-phase').addEventListener('click', () => { state.view = state.view === BOSS_VIEW ? FINAL_VIEW : state.view === 9 ? TRANSITION_VIEW : state.view + 1; saveState(); render(); });
$('face-boss').addEventListener('click', () => { state.view = BOSS_VIEW; saveState(); render(); });
$('open-bank').addEventListener('click', () => { renderBank('players'); $('bank-dialog').showModal(); });
$('close-bank').addEventListener('click', () => $('bank-dialog').close());
$('tab-players').addEventListener('click', () => renderBank('players'));
$('tab-matches').addEventListener('click', () => renderBank('matches'));
$('restart').addEventListener('click', () => $('restart-dialog').showModal());
$('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
$('confirm-restart').addEventListener('click', () => { $('restart-dialog').close(); state = freshState(); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_KEY); $('student-name').value = ''; $('student-class').value = ''; render(); });
$('download').addEventListener('click', downloadAnswers);
$('confirm-migration-reset').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_KEY); state = freshState(); $('migration-dialog').close(); render(); });
$('acknowledge-migration').addEventListener('click', () => $('migration-dialog').close());

render();
if (initial.migrated) saveState();
if (initial.notice) {
  $('migration-message').textContent = initial.notice;
  $('acknowledge-migration').classList.toggle('hidden', initial.blocked);
  $('confirm-migration-reset').classList.toggle('hidden', !initial.blocked);
  $('migration-dialog').addEventListener('cancel', event => { if (initial.blocked) event.preventDefault(); });
  $('migration-dialog').showModal();
}
try { db = await createDatabase(window.initSqlJs, new URL('./vendor/sql-wasm.wasm', import.meta.url).href); }
catch (error) { console.error('Falha ao carregar SQLite:', error); if (!$('game').classList.contains('hidden')) setFeedback('Não foi possível carregar o banco de dados. Recarregue a página.', 'error'); }
