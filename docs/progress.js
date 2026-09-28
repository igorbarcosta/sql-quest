export const STORAGE_KEY = 'sql-quest-v2';
export const LEGACY_KEY = 'sql-quest-v1';
export const TRANSITION_VIEW = 10;
export const BOSS_VIEW = 11;
export const FINAL_VIEW = 12;

export const newPhase = () => ({ draft: '', winning: '', completed: false, stars: 0, hints: 0, attempts: 0 });
export const newBoss = () => ({ draft: '', winning: '', completed: false, hints: 0, attempts: 0 });
export const freshState = () => ({ storageVersion: 2, name: '', className: '', view: 0, completedAt: '', phases: Array.from({ length: 10 }, newPhase), boss: newBoss() });

function validProgress(value) {
  return value && typeof value === 'object' && typeof value.draft === 'string' &&
    typeof value.winning === 'string' && typeof value.completed === 'boolean' &&
    Number.isInteger(value.hints) && value.hints >= 0 &&
    Number.isInteger(value.attempts) && value.attempts >= 0;
}
function validRegular(value) { return validProgress(value) && Number.isInteger(value.stars) && value.stars >= 0 && value.stars <= 3; }
function validIdentity(value) { return typeof value.name === 'string' && typeof value.className === 'string'; }
function parseSaved(storage, key) {
  let raw;
  try { raw = storage.getItem(key); } catch (_) { return null; }
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch (_) { return false; }
}
export function readProgress(storage) {
  const current = parseSaved(storage, STORAGE_KEY);
  if (current !== null) {
    if (current && current.storageVersion === 2 && validIdentity(current) &&
      Array.isArray(current.phases) && current.phases.length === 10 && current.phases.every(validRegular) &&
      validProgress(current.boss) && Number.isInteger(current.view) && current.view >= 0 && current.view <= FINAL_VIEW) {
      return { state: { ...freshState(), ...current }, notice: '', blocked: false };
    }
    return { state: freshState(), notice: 'O progresso salvo não tem um formato reconhecido. Seus dados não foram apagados. Para começar uma nova revisão, confirme o reinício.', blocked: true };
  }
  const legacy = parseSaved(storage, LEGACY_KEY);
  if (legacy === null) return { state: freshState(), notice: '', blocked: false };
  if (!legacy || !validIdentity(legacy) || !Array.isArray(legacy.phases) || legacy.phases.length !== 10 ||
      !legacy.phases.every(validRegular) || !Number.isInteger(legacy.view)) {
    return { state: freshState(), notice: 'O progresso anterior não pôde ser migrado com segurança. Ele permanece salvo. Confirme o reinício se quiser começar novamente.', blocked: true };
  }
  const state = freshState();
  state.name = legacy.name; state.className = legacy.className;
  // As saídas das fases 7 e 8 mudaram. As demais respostas continuam válidas.
  state.phases = legacy.phases.map((phase, index) => index === 6 || index === 7 ? newPhase() : { ...newPhase(), ...phase });
  state.view = Math.min(Math.max(legacy.view, 0), 6);
  return { state, notice: 'Seu progresso anterior foi migrado. As fases 7 e 8 mudaram e precisam ser resolvidas novamente; as respostas das demais fases foram preservadas.', blocked: false, migrated: true };
}
export function writeProgress(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
