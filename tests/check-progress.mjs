import assert from 'node:assert/strict';
import { freshState, readProgress, writeProgress, LEGACY_KEY, STORAGE_KEY } from '../docs/progress.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
const storage = memoryStorage();
let result = readProgress(storage);
assert.equal(result.blocked, false);
assert.equal(result.state.storageVersion, 2);

const old = freshState();
delete old.storageVersion; delete old.boss;
old.name = 'Ígor'; old.className = '2º A'; old.view = 10;
old.phases.forEach((phase, index) => { phase.draft = `consulta ${index + 1}`; phase.winning = phase.draft; phase.completed = true; phase.stars = 3; phase.attempts = 1; });
storage.setItem(LEGACY_KEY, JSON.stringify(old));
result = readProgress(storage);
assert.equal(result.migrated, true);
assert.equal(result.state.view, 6);
assert.equal(result.state.phases.slice(0, 6).every(p => p.completed), true);
assert.equal(result.state.phases[6].completed, false);
assert.equal(result.state.phases[7].completed, false);
assert.equal(result.state.phases[8].completed, true);
assert.equal(result.state.phases[9].completed, true);
assert.equal(result.state.boss.completed, false);
assert.equal(storage.getItem(LEGACY_KEY) !== null, true, 'Backup anterior preservado');
writeProgress(storage, result.state);
assert.equal(readProgress(storage).state.name, 'Ígor');

storage.setItem(STORAGE_KEY, '{invalid');
result = readProgress(storage);
assert.equal(result.blocked, true);
assert.equal(storage.getItem(STORAGE_KEY), '{invalid', 'Progresso incompatível não é apagado automaticamente');
console.log('OK: migração v1→v2, preservação das fases compatíveis e bloqueio de dados inválidos.');
