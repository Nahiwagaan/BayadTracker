import * as SQLite from 'expo-sqlite';

export type Borrower = {
  id: number;
  fullName: string;
  phoneNumber: string | null;
  homeAddress: string | null;
  createdAt: string;
};

type CreateBorrowerInput = {
  fullName: string;
  phoneNumber?: string;
  homeAddress?: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('bayadtracker.db');
  return dbPromise;
}

export function initBorrowersDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS borrowers (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, phone_number TEXT, home_address TEXT, created_at TEXT NOT NULL);'
    );

    // Lightweight migrations for dev while schema evolves.
    // `CREATE TABLE IF NOT EXISTS` does not update existing tables.
    try {
      await db.execAsync('ALTER TABLE borrowers ADD COLUMN phone_number TEXT;');
    } catch {}
    try {
      await db.execAsync('ALTER TABLE borrowers ADD COLUMN home_address TEXT;');
    } catch {}
    try {
      await db.execAsync('ALTER TABLE borrowers ADD COLUMN created_at TEXT;');
    } catch {}
  })();

  return initPromise;
}

export async function createBorrower(input: CreateBorrowerInput) {
  await initBorrowersDb();

  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('Full name is required');

  const phoneNumber = (input.phoneNumber ?? '').trim();
  const homeAddress = (input.homeAddress ?? '').trim();
  const createdAt = new Date().toISOString();

  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO borrowers (full_name, phone_number, home_address, created_at) VALUES (?, ?, ?, ?);',
    [fullName, phoneNumber || null, homeAddress || null, createdAt]
  );

  return result.lastInsertRowId as number;
}

export async function listBorrowers() {
  await initBorrowersDb();

  const db = await getDb();
  return db.getAllAsync<Borrower>(
    'SELECT id, full_name as fullName, phone_number as phoneNumber, home_address as homeAddress, created_at as createdAt FROM borrowers ORDER BY id DESC;'
  );
}

export async function deleteBorrower(id: number) {
  await initBorrowersDb();
  const db = await getDb();
  await db.runAsync('DELETE FROM borrowers WHERE id = ?;', [id]);
}

export async function getBorrowerById(id: number) {
  await initBorrowersDb();

  const db = await getDb();
  const rows = await db.getAllAsync<Borrower>(
    'SELECT id, full_name as fullName, phone_number as phoneNumber, home_address as homeAddress, created_at as createdAt FROM borrowers WHERE id = ? LIMIT 1;',
    [id]
  );
  return rows[0] ?? null;
}

export async function updateBorrower(id: number, input: Partial<CreateBorrowerInput>) {
  await initBorrowersDb();
  const db = await getDb();

  const sets: string[] = [];
  const args: any[] = [];

  if (input.fullName !== undefined) {
    sets.push('full_name = ?');
    args.push(input.fullName.trim());
  }
  if (input.phoneNumber !== undefined) {
    sets.push('phone_number = ?');
    args.push(input.phoneNumber.trim() || null);
  }
  if (input.homeAddress !== undefined) {
    sets.push('home_address = ?');
    args.push(input.homeAddress.trim() || null);
  }

  if (sets.length === 0) return;

  args.push(id);
  await db.runAsync(`UPDATE borrowers SET ${sets.join(', ')} WHERE id = ?;`, args);
}
