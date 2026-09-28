import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
const [regularReference, bossReference] = readFileSync(new URL('../gabarito-professor.sql', import.meta.url), 'utf8').split(/-- CHEFÃO\n/);
const queries = regularReference.split(/-- Fase \d+\n/).slice(1).map(text => text.trim());
const bossQuery = bossReference.trim();
assert.equal(queries.length, 10);

const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) { const { resolve, reject } = pending.get(data.id); pending.delete(data.id); data.error ? reject(Error(data.error.message)) : resolve(data.result); }
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') errors.push(data.params.args.map(a => a.value || a.description).join(' '));
});
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; }
async function until(test, timeout = 8000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await test()) return; await wait(80); } throw Error('Tempo excedido'); }
async function screenshot(path) { const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(path, Buffer.from(result.data, 'base64')); }
async function setViewport(width, height) { await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }); }
async function setSql(sql) { await evaluate(`(()=>{const e=document.getElementById('sql-editor');e.value=${JSON.stringify(sql)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
async function click(id) { await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`); }

await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: '/tmp/sql-quest-download', eventsEnabled: true });
mkdirSync('/tmp/sql-quest-download', { recursive: true });
await setViewport(1366, 768);
await cdp('Page.navigate', { url: 'http://127.0.0.1:8000/' });
await until(() => evaluate("!!document.getElementById('start-form')"));
await evaluate("localStorage.removeItem('sql-quest-v1');localStorage.removeItem('sql-quest-v2')");
await cdp('Page.reload', { ignoreCache: true });
await until(() => evaluate("!!document.getElementById('start-form')"));
await screenshot('/tmp/sql-quest-start-desktop.png');
await evaluate("document.getElementById('student-name').value='Ígor';document.getElementById('student-class').value='2º A';document.getElementById('start-form').requestSubmit()");
await until(() => evaluate("!document.getElementById('game').classList.contains('hidden')"));
await setSql(queries[0]);
await click('validate');
await until(() => evaluate("document.getElementById('feedback').classList.contains('success')"));
await screenshot('/tmp/sql-quest-phase-desktop.png');
// Three completed phases, then reload and verify the current phase and drafts.
for (let i = 1; i < 3; i++) { await click('next-phase'); await setSql(queries[i]); await click('validate'); assert.equal(await evaluate("document.getElementById('feedback').classList.contains('success')"), true); }
await click('next-phase');
assert.equal(await evaluate("document.getElementById('phase-progress').textContent"), 'Fase 4/10');
await cdp('Page.reload', { ignoreCache: true });
await until(() => evaluate("document.getElementById('phase-progress')?.textContent==='Fase 4/10'"));
assert.equal(await evaluate("JSON.parse(localStorage.getItem('sql-quest-v2')).phases.slice(0,3).every(p=>p.completed&&p.winning)"), true);
await click('open-bank');
assert.equal(await evaluate("document.querySelectorAll('#bank-content tbody tr').length"), 8);
await click('tab-matches');
assert.equal(await evaluate("document.querySelectorAll('#bank-content tbody tr').length"), 10);
await click('close-bank');
await setSql('SELECT nome FROM jogadores;');
await click('execute');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('sql-quest-v2')).phases[3].attempts"), 0, 'Executar não conta tentativa');
await click('hint-button');
assert.equal(await evaluate("document.getElementById('phase-stars').textContent"), '★★☆');
await click('validate');
assert.equal(await evaluate("document.getElementById('feedback').textContent.includes('colunas')"), true);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('sql-quest-v2')).phases[3].attempts"), 1);
assert.equal(await evaluate("document.getElementById('phase-stars').textContent"), '★★☆', 'Tentativa errada não reduz estrelas');
for (let i = 3; i < 10; i++) {
  if (i === 9) assert.equal(await evaluate("document.querySelector('.boss-step').disabled"), true, 'Chefão bloqueado antes da Fase 10');
  if (i === 6) await screenshot('/tmp/sql-quest-phase7-desktop.png');
  await setSql(queries[i]); await click('validate');
  assert.equal(await evaluate("document.getElementById('feedback').classList.contains('success')"), true, `fase ${i + 1}`);
  if (i === 8) assert.equal(await evaluate("!document.getElementById('lesson-note').classList.contains('hidden')"), true);
  await click('next-phase');
}
assert.equal(await evaluate("!document.getElementById('transition-screen').classList.contains('hidden')"), true);
assert.equal(await evaluate("document.querySelector('.boss-step').disabled"), false);
await screenshot('/tmp/sql-quest-transition-desktop.png');
await click('face-boss');
assert.equal(await evaluate("document.getElementById('phase-progress').textContent"), '⚔ CHEFÃO');
await setSql('SELECT nome FROM jogadores;');
await click('hint-button'); await click('hint-button'); await click('hint-button');
assert.equal(await evaluate("document.querySelectorAll('#hint-list .hint').length"), 3);
assert.equal(await evaluate("document.getElementById('phase-stars').textContent"), '⚔ PENDENTE');
await cdp('Page.reload', { ignoreCache: true });
await until(() => evaluate("document.getElementById('phase-progress')?.textContent==='⚔ CHEFÃO'"));
assert.equal(await evaluate("document.getElementById('sql-editor').value"), 'SELECT nome FROM jogadores;');
assert.equal(await evaluate("document.querySelectorAll('#hint-list .hint').length"), 3);
await setSql(bossQuery);
await click('validate');
assert.equal(await evaluate("document.getElementById('feedback').classList.contains('success')"), true);
assert.equal(await evaluate("document.querySelector('.boss-step').textContent.includes('🏆')"), true);
await screenshot('/tmp/sql-quest-boss-desktop.png');
await click('next-phase');
assert.equal(await evaluate("!document.getElementById('final-screen').classList.contains('hidden')"), true);
assert.equal(await evaluate("document.getElementById('final-stars').textContent"), '29 / 30');
assert.equal(await evaluate("document.querySelector('.boss-defeated').textContent.includes('CHEFÃO DERROTADO')"), true);
await screenshot('/tmp/sql-quest-final-desktop.png');
if (existsSync('/tmp/sql-quest-download/revisao_sql_igor.sql')) unlinkSync('/tmp/sql-quest-download/revisao_sql_igor.sql');
await click('download');
await until(() => Promise.resolve(existsSync('/tmp/sql-quest-download/revisao_sql_igor.sql')));
const content = readFileSync('/tmp/sql-quest-download/revisao_sql_igor.sql', 'utf8');
assert.equal((content.match(/-- Fase \d+/g) || []).length, 10);
queries.forEach(query => assert.ok(content.includes(query), query));
assert.equal((content.match(/-- CHEFÃO/g) || []).length, 1);
assert.ok(content.includes(bossQuery));
assert.equal(content.includes('-- Fase 11'), false);
assert.equal(content.includes('-- Aluno: Ígor'), true);
await setViewport(390, 844);
await screenshot('/tmp/sql-quest-final-mobile.png');
await evaluate("document.querySelector('.phase-step').click()");
await screenshot('/tmp/sql-quest-phase-mobile.png');
assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Sem rolagem horizontal mobile');
await evaluate("(()=>{const old=JSON.parse(localStorage.getItem('sql-quest-v2'));delete old.storageVersion;delete old.boss;old.view=10;localStorage.setItem('sql-quest-v1',JSON.stringify(old));localStorage.removeItem('sql-quest-v2')})()");
await cdp('Page.reload', { ignoreCache: true });
await until(() => evaluate("document.getElementById('migration-dialog')?.open===true"));
assert.equal(await evaluate("document.getElementById('migration-message').textContent.includes('fases 7 e 8')"), true);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('sql-quest-v2')).phases[6].completed"), false);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('sql-quest-v2')).phases[9].completed"), true);
await click('acknowledge-migration');
await evaluate("localStorage.setItem('sql-quest-v2','{invalid')");
await cdp('Page.reload', { ignoreCache: true });
await until(() => evaluate("document.getElementById('migration-dialog')?.open===true"));
assert.equal(await evaluate("localStorage.getItem('sql-quest-v2')"), '{invalid');
assert.equal(await evaluate("!document.getElementById('confirm-migration-reset').classList.contains('hidden')"), true);
await click('confirm-migration-reset');
assert.equal(await evaluate("localStorage.getItem('sql-quest-v2')"), null);
assert.deepEqual(errors, [], `Console: ${errors.join('; ')}`);
console.log('OK: 10 fases, transição, Chefão, persistência, migração, banco, download, desktop/mobile e console sem erros.');
socket.close();
