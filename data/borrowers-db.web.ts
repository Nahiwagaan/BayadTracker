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

// Web note:
// expo-sqlite uses wa-sqlite (.wasm) on web. If Metro isn't configured to load .wasm,
// importing expo-sqlite will fail at bundle time.
// This fallback keeps the app running on web; native platforms still use SQLite.

let _rows: Borrower[] = [];
let _nextId = 1;

export async function initBorrowersDb() {
  // no-op
}

export async function createBorrower(input: CreateBorrowerInput) {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('Full name is required');

  const now = new Date().toISOString();
  const row: Borrower = {
    id: _nextId++,
    fullName,
    phoneNumber: (input.phoneNumber ?? '').trim() || null,
    homeAddress: (input.homeAddress ?? '').trim() || null,
    createdAt: now,
  };
  _rows = [row, ..._rows];
  return row.id;
}

export async function listBorrowers() {
  return _rows;
}

export async function getBorrowerById(id: number) {
  return _rows.find((b) => b.id === id) ?? null;
}

export async function deleteBorrower(id: number) {
  _rows = _rows.filter((b) => b.id !== id);
}
