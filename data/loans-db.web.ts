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
};

type CreateLoanInput = {
  borrowerId: number;
  principalAmount: number;
  interestAmount: number;
  durationWeeks: number;
};

let _rows: Loan[] = [];
let _nextId = 1;

export async function initLoansDb() {
  // no-op
}

export async function createLoan(input: CreateLoanInput) {
  const principalAmount = Math.round(input.principalAmount);
  const interestAmount = Math.round(input.interestAmount);
  const durationWeeks = Math.round(input.durationWeeks);

  if (!Number.isFinite(principalAmount) || principalAmount <= 0) throw new Error('Principal amount must be greater than 0');
  if (!Number.isFinite(interestAmount) || interestAmount < 0) throw new Error('Interest amount must be 0 or greater');
  if (!Number.isFinite(durationWeeks) || durationWeeks <= 0) throw new Error('Duration must be greater than 0');

  const totalAmount = principalAmount + interestAmount;
  const frequency = 'weekly' as const;
  const title = `Personal Loan #${String(_nextId).padStart(3, '0')}`;

  const createdAt = new Date().toISOString();
  const row: Loan = {
    id: _nextId++,
    borrowerId: input.borrowerId,
    title,
    principalAmount,
    interestAmount,
    durationWeeks,
    frequency,
    totalAmount,
    paidAmount: 0,
    status: 'active',
    createdAt,
  };

  _rows = [row, ..._rows];
  return row.id;
}

export async function listLoansByBorrower(borrowerId: number) {
  return _rows.filter((l) => l.borrowerId === borrowerId);
}

export async function getLoanById(id: number) {
  return _rows.find((l) => l.id === id) ?? null;
}

export async function deleteLoansByBorrower(borrowerId: number) {
  _rows = _rows.filter((l) => l.borrowerId !== borrowerId);
}

export async function setLoanPaidAmount(loanId: number, paidAmount: number) {
  const idx = _rows.findIndex((l) => l.id === loanId);
  if (idx === -1) return;
  _rows[idx] = { ..._rows[idx], paidAmount: Math.max(0, Math.round(paidAmount)) };
}
