import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLoanById as getLoanByIdDb, setLoanPaidAmount, type Loan } from '@/data/loans-db';
import {
  computePaidAmountForLoan,
  ensureWeeklyPaymentsForLoan,
  listWeeklyPaymentsByLoan,
  updateWeeklyPayment,
  type WeeklyPaymentRow,
} from '@/data/weekly-payments-db';

function formatPeso(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const fixed = Math.round(n * 100) / 100;
  const hasCents = Math.abs(fixed % 1) > 0;
  const text = hasCents
    ? fixed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(fixed).toLocaleString();
  return `₱${text}`;
}

function PaymentRow({
  item,
  isDark,
  selectedMode,
  onSelectMode,
  onApplyCustom,
}: {
  item: WeeklyPaymentRow;
  isDark: boolean;
  selectedMode: 'paid' | 'unpaid' | 'custom' | null;
  onSelectMode: (mode: 'paid' | 'unpaid' | 'custom') => void;
  onApplyCustom: (amountToApply: number) => void;
}) {
  const due = Math.max(0, item.dueAmount ?? 0);
  const paid = Math.max(0, item.paidAmount ?? 0);
  const remaining = Math.max(0, due - paid);

  const derivedState =
    paid >= due && due > 0
      ? 'paid'
      : paid > 0
        ? 'partial'
        : item.status === 'unpaid'
          ? 'unpaid'
          : 'pending';

  const circle =
    derivedState === 'paid'
      ? { bg: '#E7FAEF', fg: '#1FBF6A', icon: 'check' as const }
      : derivedState === 'partial'
        ? { bg: '#FFF0E3', fg: '#FF8A3D', icon: 'more-horiz' as const }
        : derivedState === 'unpaid'
          ? { bg: '#FFE9E9', fg: '#FF3B30', icon: 'close' as const }
          : { bg: isDark ? '#111821' : '#EEF2F5', fg: '#9AA4AD', icon: 'radio-button-unchecked' as const };

  const statusLabel =
    derivedState === 'paid'
      ? 'PAID'
      : derivedState === 'partial'
        ? 'PARTIAL'
        : derivedState === 'unpaid'
          ? 'UNPAID'
          : 'PENDING';
  const statusPill =
    derivedState === 'paid'
      ? { bg: '#E7FAEF', fg: '#1FBF6A' }
      : derivedState === 'partial'
        ? { bg: '#FFF0E3', fg: '#FF8A3D' }
        : derivedState === 'unpaid'
          ? { bg: '#FFE9E9', fg: '#FF3B30' }
          : { bg: isDark ? '#111821' : '#EEF2F5', fg: isDark ? '#9BA1A6' : '#7A8590' };

  const cardBorder =
    derivedState === 'partial'
      ? '#FFD7B5'
      : derivedState === 'unpaid'
        ? '#FFB4B4'
        : 'transparent';

  const cardTint =
    derivedState === 'partial'
      ? (isDark ? '#1B1510' : '#FFF7ED')
      : derivedState === 'unpaid'
        ? (isDark ? '#1B1010' : '#FFF1F1')
        : (isDark ? '#141A20' : '#FFFFFF');

  const [customText, setCustomText] = useState(String(remaining));
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    setCustomText(String(remaining));
  }, [remaining, item.weekNo]);

  useEffect(() => {
    if (selectedMode !== 'custom') setCustomOpen(false);
  }, [selectedMode, item.weekNo]);

  const customAmount = useMemo(() => {
    const cleaned = customText.replace(/[^0-9]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }, [customText]);

  const segmentOffBg = isDark ? '#0E1216' : '#EDF1F4';
  const segmentOffText = isDark ? '#9BA1A6' : '#7A8590';

  const iconColor = derivedState === 'paid' ? '#1FBF6A' : derivedState === 'partial' ? '#FF8A3D' : derivedState === 'unpaid' ? '#FF3B30' : '#9AA4AD';

  return (
    <View style={[styles.paymentRow, { backgroundColor: cardTint, borderColor: cardBorder }]}>
      <View style={styles.paymentRowTop}>
        <View style={[styles.paymentIcon, { backgroundColor: circle.bg }]}> 
          <MaterialIcons name={circle.icon} size={16} color={circle.fg} />
        </View>
        <View style={styles.paymentText}>
          <Text style={[styles.paymentWeek, { color: isDark ? '#ECEDEE' : '#101822' }]}>Week {item.weekNo}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.paymentMeta, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
              Due: {formatPeso(due)}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
              <Text style={[styles.statusPillText, { color: statusPill.fg }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.paymentMeta, { color: iconColor }]}>
            {formatPeso(paid)} paid
            {derivedState === 'partial' ? ` • ${formatPeso(remaining)} remaining` : ''}
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={() => {}} style={styles.dotsButton}>
          <MaterialIcons name="more-vert" size={18} color={isDark ? '#6E7781' : '#A6AFB7'} />
        </Pressable>
      </View>

      <View style={styles.segmentWrap}> 
        <Pressable
          onPress={() => onSelectMode('paid')}
          style={[
            styles.segment,
            { backgroundColor: segmentOffBg },
            selectedMode === 'paid' && { backgroundColor: '#1FBF6A' },
          ]}>
          <Text style={[styles.segmentText, { color: selectedMode === 'paid' ? '#FFFFFF' : segmentOffText }]}>
            Paid
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectMode('unpaid')}
          style={[
            styles.segment,
            { backgroundColor: segmentOffBg },
            selectedMode === 'unpaid' && { backgroundColor: '#FF3B30' },
          ]}>
          <Text style={[styles.segmentText, { color: selectedMode === 'unpaid' ? '#FFFFFF' : segmentOffText }]}>
            Unpaid
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const nextOpen = selectedMode === 'custom' ? !customOpen : true;
            onSelectMode('custom');
            setCustomOpen(nextOpen);
          }}
          style={[
            styles.segment,
            { backgroundColor: segmentOffBg },
            selectedMode === 'custom' && { backgroundColor: '#FF8A3D' },
          ]}>
          <Text style={[styles.segmentText, { color: selectedMode === 'custom' ? '#FFFFFF' : segmentOffText }]}>
            Custom
          </Text>
        </Pressable>
      </View>

      {selectedMode === 'custom' && customOpen && (
        <View style={styles.customRow}>
          <View style={[styles.customInput, { backgroundColor: isDark ? '#0E1216' : '#FFFFFF' }]}>
            <Text style={[styles.customPeso, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>₱</Text>
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              keyboardType="numeric"
              style={[styles.customTextInput, { color: isDark ? '#ECEDEE' : '#101822' }]}
              placeholder="0"
              placeholderTextColor={isDark ? '#6E7781' : '#A6AFB7'}
            />
          </View>
          <Pressable
            onPress={() => {
              onApplyCustom(customAmount);
              setCustomOpen(false);
            }}
            style={styles.applyButton}>
            <Text style={[styles.applyText, { fontFamily: Fonts.rounded }]}>Apply</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function LoanDetailsScreen() {
  const isDark = useColorScheme() === 'dark';
  const params = useLocalSearchParams<{ id?: string }>();

  const loanId = useMemo(() => Number(params.id), [params.id]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [weeks, setWeeks] = useState<WeeklyPaymentRow[]>([]);
  const [modes, setModes] = useState<Record<number, 'paid' | 'unpaid' | 'custom' | null>>({});

  const refresh = useCallback(() => {
    let cancelled = false;

    (async () => {
      if (!Number.isFinite(loanId)) {
        if (!cancelled) setLoan(null);
        return;
      }

      try {
        const row = await getLoanByIdDb(loanId);
        if (!cancelled) setLoan(row);

        if (row) {
          await ensureWeeklyPaymentsForLoan(row.id, row.totalAmount, row.durationWeeks);
          const wp = await listWeeklyPaymentsByLoan(row.id);
          if (!cancelled) setWeeks(wp);

          const nextModes: Record<number, 'paid' | 'unpaid' | 'custom' | null> = {};
          for (const w of wp) {
            const due = Math.max(0, w.dueAmount ?? 0);
            const paid = Math.max(0, w.paidAmount ?? 0);
            nextModes[w.weekNo] =
              paid >= due && due > 0 ? 'paid' : paid > 0 ? 'custom' : w.status === 'unpaid' ? 'unpaid' : null;
          }
          if (!cancelled) setModes(nextModes);
        } else {
          if (!cancelled) setWeeks([]);
          if (!cancelled) setModes({});
        }
      } catch {
        if (!cancelled) setLoan(null);
        if (!cancelled) setWeeks([]);
        if (!cancelled) setModes({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loanId]);

  useFocusEffect(
    useCallback(() => {
      return refresh();
    }, [refresh])
  );

  const total = loan?.totalAmount ?? 0;
  const paid = Math.max(0, loan?.paidAmount ?? 0);
  const remaining = Math.max(0, total - paid);
  const progress = total > 0 ? Math.min(1, Math.max(0, paid / total)) : 0;

  const syncPaidAmount = useCallback(
    async (id: number) => {
      const computed = await computePaidAmountForLoan(id);
      await setLoanPaidAmount(id, computed);
      const row = await getLoanByIdDb(id);
      setLoan(row);
    },
    []
  );

  const onSelectMode = useCallback(
    async (weekNo: number, mode: 'paid' | 'unpaid' | 'custom') => {
      if (!loan) return;
      setModes((prev) => ({ ...prev, [weekNo]: mode }));

      const row = weeks.find((w) => w.weekNo === weekNo);
      const due = Math.max(0, row?.dueAmount ?? 0);

      if (mode === 'paid') {
        await updateWeeklyPayment(loan.id, weekNo, { status: 'paid', paidAmount: due });
        await syncPaidAmount(loan.id);
        setWeeks(await listWeeklyPaymentsByLoan(loan.id));
      } else if (mode === 'unpaid') {
        await updateWeeklyPayment(loan.id, weekNo, { status: 'unpaid', paidAmount: 0 });
        await syncPaidAmount(loan.id);
        setWeeks(await listWeeklyPaymentsByLoan(loan.id));
      }
      // custom waits for Apply
    },
    [loan, syncPaidAmount, weeks]
  );

  const onApplyCustom = useCallback(
    async (weekNo: number, amount: number) => {
      if (!loan) return;

      const row = weeks.find((w) => w.weekNo === weekNo);
      if (!row) return;

      const due = Math.max(0, row.dueAmount ?? 0);
      const currentPaid = Math.max(0, row.paidAmount ?? 0);
      const delta = Math.max(0, Math.round(amount));
      const nextPaid = Math.min(due, currentPaid + delta);

      await updateWeeklyPayment(loan.id, weekNo, {
        status: nextPaid >= due && due > 0 ? 'paid' : 'unpaid',
        paidAmount: nextPaid,
      });
      await syncPaidAmount(loan.id);
      setWeeks(await listWeeklyPaymentsByLoan(loan.id));
      setModes((prev) => ({ ...prev, [weekNo]: nextPaid >= due && due > 0 ? 'paid' : 'custom' }));
    },
    [loan, syncPaidAmount, weeks]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <MaterialIcons name="arrow-back" size={22} color={isDark ? '#ECEDEE' : '#101822'} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#101822' }]}>
          Loan Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <Text style={[styles.summaryLabel, { color: isDark ? '#77808A' : '#8C97A1' }]}>TOTAL LOAN AMOUNT</Text>
          <Text style={[styles.summaryAmount, { color: isDark ? '#ECEDEE' : '#101822' }]}>
            {formatPeso(total)}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <View style={[styles.summaryMarker, { backgroundColor: '#1FBF6A' }]} />
              <View>
                <Text style={[styles.summarySmall, { color: isDark ? '#9BA1A6' : '#8C97A1' }]}>Paid</Text>
                <Text style={[styles.summaryValue, { color: '#1FBF6A' }]}>{formatPeso(paid)}</Text>
              </View>
            </View>
            <View style={styles.summaryCol}>
              <View style={[styles.summaryMarker, { backgroundColor: '#FF3B30' }]} />
              <View>
                <Text style={[styles.summarySmall, { color: isDark ? '#9BA1A6' : '#8C97A1' }]}>Remaining</Text>
                <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>{formatPeso(remaining)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#0E1216' : '#EAF0F3' }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <MaterialIcons name="calendar-month" size={18} color={isDark ? '#C7D0D8' : '#5E6A75'} />
          <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Weekly Payments</Text>
        </View>

        <View style={styles.paymentList}>
          {weeks.map((w) => (
            <PaymentRow
              key={w.id}
              item={w}
              isDark={isDark}
              selectedMode={modes[w.weekNo] ?? (w.paidAmount >= w.dueAmount && w.dueAmount > 0 ? 'paid' : w.paidAmount > 0 ? 'custom' : w.status === 'unpaid' ? 'unpaid' : null)}
              onSelectMode={(mode) => onSelectMode(w.weekNo, mode)}
              onApplyCustom={(amount) => onApplyCustom(w.weekNo, amount)}
            />
          ))}
        </View>

        {!loan && (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <Text style={[styles.emptyTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>No loan details</Text>
            <Text style={[styles.emptyBody, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>This loan is not in the database yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summaryAmount: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '900',
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 18,
  },
  summaryCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  summaryMarker: {
    width: 3,
    height: 32,
    borderRadius: 2,
    marginTop: 2,
  },
  summarySmall: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1FBF6A',
  },
  sectionHeader: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  paymentList: {
    marginTop: 12,
    gap: 10,
  },
  emptyCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  paymentRow: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  paymentRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentText: {
    flex: 1,
  },
  paymentWeek: {
    fontSize: 13,
    fontWeight: '900',
  },
  paymentMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dotsButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '900',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customInput: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6ECEF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customPeso: {
    fontSize: 12,
    fontWeight: '900',
  },
  customTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    paddingVertical: 0,
  },
  applyButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1FBF6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
