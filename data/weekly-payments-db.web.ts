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

let _rows: WeeklyPaymentRow[] = [];
let _nextId = 1;

export async function initWeeklyPaymentsDb() {
  // no-op
}

function buildDueAmounts(total: number, weeks: number) {
  const w = Math.max(1, Math.round(weeks));
  const base = Math.floor(total / w);
  const remainder = total - base * w;
  return Array.from({ length: w }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

export async function ensureWeeklyPaymentsForLoan(loanId: number, totalAmount: number, durationWeeks: number) {
  const existing = _rows.filter((r) => r.loanId === loanId);
  if (existing.length) return;

  const now = new Date().toISOString();
  const dues = buildDueAmounts(Math.max(0, Math.round(totalAmount)), durationWeeks);
  for (let i = 0; i < dues.length; i++) {
    _rows.push({
      id: _nextId++,
      loanId,
      weekNo: i + 1,
      dueAmount: dues[i],
      paidAmount: 0,
      status: 'pending',
      customAmount: null,
      updatedAt: now,
    });
  }
}

export async function listWeeklyPaymentsByLoan(loanId: number) {
  return _rows
    .filter((r) => r.loanId === loanId)
    .sort((a, b) => a.weekNo - b.weekNo);
}

export async function updateWeeklyPayment(
  loanId: number,
  weekNo: number,
  patch: { status?: WeeklyPaymentStatus; paidAmount?: number }
) {
  const idx = _rows.findIndex((r) => r.loanId === loanId && r.weekNo === weekNo);
  if (idx === -1) return;
  _rows[idx] = {
    ..._rows[idx],
    status: patch.status ?? _rows[idx].status,
    paidAmount: patch.paidAmount !== undefined ? Math.max(0, Math.round(patch.paidAmount)) : _rows[idx].paidAmount,
    updatedAt: new Date().toISOString(),
  };
}

export async function computePaidAmountForLoan(loanId: number) {
  return _rows
    .filter((r) => r.loanId === loanId)
    .reduce((sum, r) => sum + (r.paidAmount ?? 0), 0);
}
