export type AppSettings = {
  defaultPrincipal: number;
  defaultInterest: number;
  defaultDuration: number;
};

const KEY = 'bayadtracker.settings';

const defaults: AppSettings = {
  defaultPrincipal: 5000,
  defaultInterest: 1000,
  defaultDuration: 10,
};

function readSettings(): AppSettings {
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      defaultPrincipal: Number(parsed.defaultPrincipal ?? defaults.defaultPrincipal),
      defaultInterest: Number(parsed.defaultInterest ?? defaults.defaultInterest),
      defaultDuration: Number(parsed.defaultDuration ?? defaults.defaultDuration),
    };
  } catch {
    return defaults;
  }
}

function writeSettings(value: AppSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function initSettingsDb() {
  const current = readSettings();
  writeSettings(current);
  return Promise.resolve();
}

export async function getSettings(): Promise<AppSettings> {
  await initSettingsDb();
  return readSettings();
}

export async function updateSetting(key: string, value: string) {
  const current = await getSettings();
  const n = Number(value);
  if (!Number.isFinite(n)) return;

  if (key === 'defaultPrincipal') current.defaultPrincipal = n;
  if (key === 'defaultInterest') current.defaultInterest = n;
  if (key === 'defaultDuration') current.defaultDuration = n;

  writeSettings(current);
}

export async function resetAllData() {
  // Web fallback: clear app settings only.
  // Data tables on web are in-memory stubs and reset on reload.
  writeSettings(defaults);
}
