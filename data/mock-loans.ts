export type LoanStatus = 'active' | 'archived';

export type BorrowerLoan = {
  id: string;
  name: string;
  total: number;
  remaining: number;
  paidCount?: number;
  totalCount?: number;
  status: LoanStatus;
  chipTone?: 'green' | 'orange' | 'gray';
};

export const MOCK_LOANS: BorrowerLoan[] = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    total: 6000,
    remaining: 2500,
    paidCount: 3,
    totalCount: 10,
    status: 'active',
    chipTone: 'green',
  },
  {
    id: '2',
    name: 'Maria Santos',
    total: 6000,
    remaining: 0,
    paidCount: 10,
    totalCount: 10,
    status: 'active',
    chipTone: 'green',
  },
  {
    id: '3',
    name: 'Ricardo Gomez',
    total: 15000,
    remaining: 8200,
    paidCount: 5,
    totalCount: 12,
    status: 'active',
    chipTone: 'orange',
  },
  {
    id: '4',
    name: 'Elena Ruiz',
    total: 4500,
    remaining: 0,
    paidCount: 8,
    totalCount: 8,
    status: 'active',
    chipTone: 'green',
  },
  {
    id: '5',
    name: 'Antonio Luna',
    total: 10000,
    remaining: 0,
    status: 'archived',
    chipTone: 'gray',
  },
];

export function formatPeso(amount: number) {
  const whole = Math.round(amount);
  return `₱${whole.toLocaleString()}`;
}

export function getLoanById(id: string) {
  return MOCK_LOANS.find((x) => x.id === id);
}

export type WeeklyPaymentStatus = 'paid' | 'unpaid' | 'pending';

export type WeeklyPayment = {
  week: number;
  amount: number;
  status: WeeklyPaymentStatus;
};

export function buildWeeklyPayments(loan: BorrowerLoan): WeeklyPayment[] {
  const totalCount = loan.totalCount ?? 10;
  const paidCount = loan.paidCount ?? 0;
  const weeklyAmount = Math.max(1, Math.round(loan.total / totalCount));

  return Array.from({ length: totalCount }, (_, idx) => {
    const week = idx + 1;
    let status: WeeklyPaymentStatus = 'pending';
    if (week <= paidCount) status = 'paid';
    else if (week === paidCount + 1 && loan.remaining > 0) status = 'unpaid';

    return {
      week,
      amount: weeklyAmount,
      status,
    };
  });
}
