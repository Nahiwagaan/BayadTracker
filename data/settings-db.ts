import * as SQLite from 'expo-sqlite';

export type AppSettings = {
  defaultPrincipal: number;
  defaultInterest: number;
  defaultDuration: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('bayadtracker.db');
  return dbPromise;
}

export function initSettingsDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);'
    );

    // Seed defaults if not present
    const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM settings WHERE key IN ("defaultPrincipal", "defaultInterest", "defaultDuration")');
    if (rows.length < 3) {
      await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', ['defaultPrincipal', '5000']);
      await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', ['defaultInterest', '1000']);
      await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', ['defaultDuration', '10']);
    }
  })();

  return initPromise;
}

export async function getSettings(): Promise<AppSettings> {
  await initSettingsDb();
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string, value: string }>('SELECT key, value FROM settings;');
  
  const settings: AppSettings = {
    defaultPrincipal: 5000,
    defaultInterest: 1000,
    defaultDuration: 10,
  };

  for (const row of rows) {
    if (row.key === 'defaultPrincipal') settings.defaultPrincipal = parseInt(row.value, 10);
    if (row.key === 'defaultInterest') settings.defaultInterest = parseInt(row.value, 10);
    if (row.key === 'defaultDuration') settings.defaultDuration = parseInt(row.value, 10);
  }

  return settings;
}

export async function updateSetting(key: string, value: string) {
  await initSettingsDb();
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, value]);
}

export async function resetAllData() {
  const db = await getDb();
  // PRAGMA foreign_keys = OFF to allow deletion without order issues.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  await db.execAsync('BEGIN;');
  try {
    // Newer schema
    try {
      await db.execAsync('DELETE FROM loan_weekly_payments;');
    } catch {}

    // Older/experimental schema name (best-effort)
    try {
      await db.execAsync('DELETE FROM weekly_payments;');
    } catch {}

    try {
      await db.execAsync('DELETE FROM loans;');
    } catch {}
    try {
      await db.execAsync('DELETE FROM borrowers;');
    } catch {}

    // Reset autoincrement counters (optional)
    try {
      await db.execAsync("DELETE FROM sqlite_sequence WHERE name IN ('borrowers','loans','loan_weekly_payments','weekly_payments');");
    } catch {}

    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
