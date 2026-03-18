import * as SQLite from 'expo-sqlite';

export type WeeklyPaymentStatus = 'paid' | 'unpaid' | 'pending';

export type WeeklyPaymentRow = {
  id: number;
  loanId: number;
  weekNo: number;
  dueAmount: number;
  paidAmount: number;
  status: WeeklyPaymentStatus;
  customAmount: number | null;
  updatedAt: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('bayadtracker.db');
  return dbPromise;
}

export function initWeeklyPaymentsDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(
      "CREATE TABLE IF NOT EXISTS loan_weekly_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, loan_id INTEGER NOT NULL, week_no INTEGER NOT NULL, due_amount INTEGER NOT NULL, paid_amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', custom_amount INTEGER, updated_at TEXT NOT NULL);"
    );
    await db.execAsync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_unique ON loan_weekly_payments (loan_id, week_no);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_weekly_loan_id ON loan_weekly_payments (loan_id);'
    );

    // Lightweight migrations for dev.
    try {
      await db.execAsync("ALTER TABLE loan_weekly_payments ADD COLUMN custom_amount INTEGER;");
    } catch {}
    try {
      await db.execAsync('ALTER TABLE loan_weekly_payments ADD COLUMN paid_amount INTEGER NOT NULL DEFAULT 0;');
    } catch {}
    try {
      await db.execAsync("ALTER TABLE loan_weekly_payments ADD COLUMN updated_at TEXT;");
    } catch {}

    // Backfill paid_amount from older fields (best-effort).
    try {
      await db.execAsync(
        "UPDATE loan_weekly_payments SET paid_amount = CASE WHEN custom_amount IS NOT NULL THEN custom_amount WHEN status = 'paid' THEN due_amount ELSE 0 END WHERE paid_amount = 0;"
      );
    } catch {}
  })();

  return initPromise;
}

function buildDueAmounts(total: number, weeks: number) {
  const w = Math.max(1, Math.round(weeks));
  const base = Math.floor(total / w);
  const remainder = total - base * w;
  return Array.from({ length: w }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

export async function ensureWeeklyPaymentsForLoan(loanId: number, totalAmount: number, durationWeeks: number) {
  await initWeeklyPaymentsDb();

  const db = await getDb();
  const rows = await db.getAllAsync<{ cnt: number }>(
    'SELECT COUNT(1) as cnt FROM loan_weekly_payments WHERE loan_id = ?;',
    [loanId]
  );
  const cnt = rows[0]?.cnt ?? 0;
  if (cnt > 0) return;

  const now = new Date().toISOString();
  const dues = buildDueAmounts(Math.max(0, Math.round(totalAmount)), durationWeeks);

  await db.execAsync('BEGIN;');
  try {
    for (let i = 0; i < dues.length; i++) {
      await db.runAsync(
        'INSERT INTO loan_weekly_payments (loan_id, week_no, due_amount, paid_amount, status, custom_amount, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [loanId, i + 1, dues[i], 0, 'pending', null, now]
      );
    }
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export async function listWeeklyPaymentsByLoan(loanId: number) {
  await initWeeklyPaymentsDb();
  const db = await getDb();
  return db.getAllAsync<WeeklyPaymentRow>(
    "SELECT id, loan_id as loanId, week_no as weekNo, due_amount as dueAmount, COALESCE(paid_amount, 0) as paidAmount, status, custom_amount as customAmount, updated_at as updatedAt FROM loan_weekly_payments WHERE loan_id = ? ORDER BY week_no ASC;",
    [loanId]
  );
}

export async function updateWeeklyPayment(
  loanId: number,
  weekNo: number,
  patch: { status?: WeeklyPaymentStatus; paidAmount?: number }
) {
  await initWeeklyPaymentsDb();
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM loan_weekly_payments WHERE loan_id = ? AND week_no = ? LIMIT 1;',
    [loanId, weekNo]
  );
  if (!existing[0]) return;

  const sets: string[] = [];
  const args: any[] = [];

  if (patch.status != null) {
    sets.push('status = ?');
    args.push(patch.status);
  }
  if (patch.paidAmount !== undefined) {
    sets.push('paid_amount = ?');
    args.push(Math.max(0, Math.round(patch.paidAmount)));
  }

  sets.push('updated_at = ?');
  args.push(now);

  args.push(loanId, weekNo);
  await db.runAsync(
    `UPDATE loan_weekly_payments SET ${sets.join(', ')} WHERE loan_id = ? AND week_no = ?;`,
    args
  );
}

export async function computePaidAmountForLoan(loanId: number) {
  await initWeeklyPaymentsDb();
  const db = await getDb();
  const rows = await db.getAllAsync<{ paid: number }>(
    'SELECT COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as paid FROM loan_weekly_payments WHERE loan_id = ?;',
    [loanId]
  );
  return rows[0]?.paid ?? 0;
}
