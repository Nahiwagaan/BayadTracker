import { listBorrowers } from '@/data/borrowers-db';
import { listAllLoans, type Loan } from '@/data/loans-db';
import { ensureWeeklyPaymentsForLoan, listWeeklyPaymentsByLoan, type WeeklyPaymentRow } from '@/data/weekly-payments-db';

export type CollectTodayItem = {
  loanId: number;
  borrowerId: number;
  borrowerName: string;
  weekNo: number;
  amountDue: number;
};

export type OutstandingUnpaidItem = {
  borrowerId: number;
  borrowerName: string;
  missedCount: number;
  missedWeeks: number[];
};

export type ReportsSnapshot = {
  totalLoaned: number;
  totalCollected: number;
  totalRemaining: number;
  collectToday: CollectTodayItem[];
  outstandingUnpaid: OutstandingUnpaidItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dueDateKeyUTC(loanCreatedAt: string, weekNo: number, disbursementDate?: string | null) {
  const base = Date.parse(disbursementDate || loanCreatedAt);
  if (!Number.isFinite(base)) return null;
  const due = new Date(base + (Math.max(1, weekNo) - 1) * 7 * DAY_MS);
  return dateKeyUTC(due);
}

function remainingForWeek(w: WeeklyPaymentRow) {
  const due = Math.max(0, w.dueAmount ?? 0);
  const paid = Math.max(0, w.paidAmount ?? 0);
  return Math.max(0, due - paid);
}

export async function getReportsSnapshot(): Promise<ReportsSnapshot> {
  const [borrowers, loans] = await Promise.all([listBorrowers(), listAllLoans()]);
  const borrowerNameById = new Map<number, string>();
  for (const b of borrowers) borrowerNameById.set(b.id, b.fullName);

  const todayKey = dateKeyUTC(new Date());

  const totalLoaned = loans.reduce((sum, l) => sum + (l.totalAmount ?? 0), 0);
  const totalCollected = loans.reduce((sum, l) => sum + (l.paidAmount ?? 0), 0);
  const totalRemaining = Math.max(0, totalLoaned - totalCollected);

  const collectToday: CollectTodayItem[] = [];
  const missedByBorrower = new Map<
    number,
    {
      borrowerName: string;
      missedWeeks: number[];
    }
  >();

  for (const loan of loans) {
    // Ensure schedule exists for reports.
    await ensureWeeklyPaymentsForLoan(loan.id, loan.totalAmount, loan.durationWeeks);
    const weeks = await listWeeklyPaymentsByLoan(loan.id);

    for (const w of weeks) {
      const rem = remainingForWeek(w);
      if (rem <= 0) continue;

      const dueKey = dueDateKeyUTC(loan.createdAt, w.weekNo, loan.disbursementDate);
      if (!dueKey) continue;

      const borrowerName = borrowerNameById.get(loan.borrowerId) ?? 'Unknown';

      if (dueKey === todayKey) {
        collectToday.push({
          loanId: loan.id,
          borrowerId: loan.borrowerId,
          borrowerName,
          weekNo: w.weekNo,
          amountDue: rem,
        });
      }

      // "Outstanding Unpaid" is driven primarily by user-marked unpaid weeks.
      // We also include any overdue weeks that still have remaining balance.
      if (w.status === 'unpaid' || dueKey < todayKey) {
        const curr = missedByBorrower.get(loan.borrowerId) ?? { borrowerName, missedWeeks: [] };
        curr.missedWeeks.push(w.weekNo);
        missedByBorrower.set(loan.borrowerId, curr);
      }
    }
  }

  collectToday.sort((a, b) => b.amountDue - a.amountDue);

  const outstandingUnpaid: OutstandingUnpaidItem[] = Array.from(missedByBorrower.entries()).map(
    ([borrowerId, v]) => {
      const uniqWeeks = Array.from(new Set(v.missedWeeks)).sort((a, b) => a - b);
      return {
        borrowerId,
        borrowerName: v.borrowerName,
        missedCount: uniqWeeks.length,
        missedWeeks: uniqWeeks,
      };
    }
  );

  outstandingUnpaid.sort((a, b) => b.missedCount - a.missedCount);

  return {
    totalLoaned,
    totalCollected,
    totalRemaining,
    collectToday,
    outstandingUnpaid,
  };
}

export function formatMissedWeeks(weeks: number[]) {
  if (!weeks.length) return '';
  if (weeks.length <= 3) return `Missed Week ${weeks.join(', ')}`;
  return `Missed Week ${weeks.slice(0, 3).join(', ')} +${weeks.length - 3}`;
}
