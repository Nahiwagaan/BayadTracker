import * as SQLite from 'expo-sqlite';

export type LoanStatus = 'active' | 'closed' | 'archived';

export type Loan = {
  id: number;
  borrowerId: number;
  title: string;
  principalAmount: number;
  interestAmount: number;
  durationWeeks: number;
  frequency: 'weekly';
  totalAmount: number;
  paidAmount: number;
  status: LoanStatus;
  createdAt: string;
  disbursementDate: string | null;
};

type CreateLoanInput = {
  borrowerId: number;
  principalAmount: number;
  interestAmount: number;
  durationWeeks: number;
  disbursementDate?: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('bayadtracker.db');
  return dbPromise;
}

export function initLoansDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(
      "CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, borrower_id INTEGER NOT NULL, title TEXT NOT NULL, principal_amount INTEGER NOT NULL, interest_amount INTEGER NOT NULL DEFAULT 0, duration_weeks INTEGER NOT NULL DEFAULT 10, frequency TEXT NOT NULL DEFAULT 'weekly', total_amount INTEGER NOT NULL, paid_amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, disbursement_date TEXT);"
    );

    // Lightweight migrations
    try {
      await db.execAsync('ALTER TABLE loans ADD COLUMN disbursement_date TEXT;');
    } catch {}
    try {
      await db.execAsync('ALTER TABLE loans ADD COLUMN paid_amount INTEGER NOT NULL DEFAULT 0;');
    } catch {}
    try {
      await db.execAsync("ALTER TABLE loans ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
    } catch {}
    try {
      await db.execAsync('ALTER TABLE loans ADD COLUMN created_at TEXT;');
    } catch {}

    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans (borrower_id);');
  })();

  return initPromise;
}

export async function createLoan(input: CreateLoanInput) {
  await initLoansDb();

  const borrowerId = input.borrowerId;
  if (!Number.isFinite(borrowerId)) throw new Error('Invalid borrower');

  const principalAmount = Math.round(input.principalAmount);
  const interestAmount = Math.round(input.interestAmount);
  const durationWeeks = Math.round(input.durationWeeks);

  if (!Number.isFinite(principalAmount) || principalAmount <= 0) throw new Error('Principal amount must be greater than 0');
  const totalAmount = principalAmount + interestAmount;
  const createdAt = new Date().toISOString();
  const disbursementDate = input.disbursementDate || createdAt;

  const db = await getDb();
  const seqRow = await db.getAllAsync<{ nextNo: number }>(
    'SELECT COALESCE(MAX(id), 0) + 1 as nextNo FROM loans WHERE borrower_id = ?;',
    [borrowerId]
  );
  const nextNo = seqRow[0]?.nextNo ?? 1;
  const title = `Personal Loan #${String(nextNo).padStart(3, '0')}`;
  
  const result = await db.runAsync(
    "INSERT INTO loans (borrower_id, title, principal_amount, interest_amount, duration_weeks, frequency, total_amount, paid_amount, status, created_at, disbursement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
    [borrowerId, title, principalAmount, interestAmount, durationWeeks, 'weekly', totalAmount, 0, 'active', createdAt, disbursementDate]
  );

  return result.lastInsertRowId as number;
}

export async function listLoansByBorrower(borrowerId: number) {
  await initLoansDb();
  const db = await getDb();
  return db.getAllAsync<Loan>(
    "SELECT id, borrower_id as borrowerId, title, COALESCE(principal_amount, 0) as principalAmount, COALESCE(interest_amount, 0) as interestAmount, COALESCE(duration_weeks, 10) as durationWeeks, COALESCE(frequency, 'weekly') as frequency, total_amount as totalAmount, paid_amount as paidAmount, status, created_at as createdAt, disbursement_date as disbursementDate FROM loans WHERE borrower_id = ? ORDER BY id DESC;",
    [borrowerId]
  );
}

export async function listAllLoans() {
  await initLoansDb();
  const db = await getDb();
  return db.getAllAsync<Loan>(
    "SELECT id, borrower_id as borrowerId, title, COALESCE(principal_amount, 0) as principalAmount, COALESCE(interest_amount, 0) as interestAmount, COALESCE(duration_weeks, 10) as durationWeeks, COALESCE(frequency, 'weekly') as frequency, total_amount as totalAmount, paid_amount as paidAmount, status, created_at as createdAt, disbursement_date as disbursementDate FROM loans ORDER BY id DESC;"
  );
}

export async function getLoanById(id: number) {
  await initLoansDb();
  const db = await getDb();
  const rows = await db.getAllAsync<Loan>(
    "SELECT id, borrower_id as borrowerId, title, COALESCE(principal_amount, 0) as principalAmount, COALESCE(interest_amount, 0) as interestAmount, COALESCE(duration_weeks, 10) as durationWeeks, COALESCE(frequency, 'weekly') as frequency, total_amount as totalAmount, paid_amount as paidAmount, status, created_at as createdAt, disbursement_date as disbursementDate FROM loans WHERE id = ? LIMIT 1;",
    [id]
  );
  return rows[0] ?? null;
}

export async function setLoanPaidAmount(loanId: number, paidAmount: number) {
  await initLoansDb();
  const db = await getDb();
  const val = Math.max(0, Math.round(paidAmount));

  // Auto-close if fully paid
  const loan = await getLoanById(loanId);
  if (!loan) return;

  const nextStatus = val >= loan.totalAmount ? 'closed' : 'active';
  await db.runAsync('UPDATE loans SET paid_amount = ?, status = ? WHERE id = ?;', [val, nextStatus, loanId]);
}

export async function deleteLoansByBorrower(borrowerId: number) {
  await initLoansDb();
  const db = await getDb();
  await db.runAsync('DELETE FROM loans WHERE borrower_id = ?;', [borrowerId]);
}

export async function deleteLoan(id: number) {
  await initLoansDb();
  const db = await getDb();
  await db.runAsync('DELETE FROM loans WHERE id = ?;', [id]);
}
