import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { deleteBorrower, getBorrowerById, type Borrower } from '@/data/borrowers-db';
import { deleteLoansByBorrower, listLoansByBorrower, setLoanPaidAmount, type Loan } from '@/data/loans-db';
import {
  computePaidAmountForLoan,
  ensureWeeklyPaymentsForLoan,
  listWeeklyPaymentsByLoan,
  updateWeeklyPayment,
  type WeeklyPaymentRow,
} from '@/data/weekly-payments-db';
import { useColorScheme } from '@/hooks/use-color-scheme';


function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

function pct(n: number) {
  return `${Math.round(Math.max(0, Math.min(100, n)))}%`;
}

function LoanPreviewCard({ loan, isDark, onRefresh }: { loan: Loan; isDark: boolean; onRefresh: () => void }) {
  const paid = Math.max(0, loan.paidAmount);
  const remaining = Math.max(0, loan.totalAmount - paid);
  const progress = loan.totalAmount > 0 ? Math.min(1, Math.max(0, paid / loan.totalAmount)) : 0;

  const [currentWeek, setCurrentWeek] = useState<WeeklyPaymentRow | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [selectedMode, setSelectedMode] = useState<'paid' | 'custom' | null>(null);

  const refreshCurrentWeek = useCallback(async () => {
    await ensureWeeklyPaymentsForLoan(loan.id, loan.totalAmount, loan.durationWeeks);
    const wp = await listWeeklyPaymentsByLoan(loan.id);
    const firstUnpaid = wp.find((w) => (w.paidAmount ?? 0) < w.dueAmount);
    setCurrentWeek(firstUnpaid || null);
    if (firstUnpaid) {
      setCustomText(String(Math.max(0, firstUnpaid.dueAmount - (firstUnpaid.paidAmount ?? 0))));
    }
  }, [loan.id, loan.totalAmount, loan.durationWeeks]);

  useFocusEffect(
    useCallback(() => {
      refreshCurrentWeek();
    }, [refreshCurrentWeek])
  );

  const onQuickPay = async (mode: 'paid' | 'custom', customVal?: number) => {
    if (!currentWeek) return;

    let remainingToApply = 0;
    if (mode === 'paid') {
      remainingToApply = Math.max(0, currentWeek.dueAmount - (currentWeek.paidAmount ?? 0));
    } else if (mode === 'custom' && customVal !== undefined) {
      remainingToApply = Math.max(0, customVal);
    }

    if (remainingToApply <= 0) return;
    setSelectedMode(mode);

    try {
      const wpList = await listWeeklyPaymentsByLoan(loan.id);
      const startIdx = wpList.findIndex((w) => w.weekNo === currentWeek.weekNo);
      if (startIdx === -1) return;

      for (let i = startIdx; i < wpList.length; i++) {
        if (remainingToApply <= 0) break;

        const w = wpList[i];
        const due = Math.max(0, w.dueAmount ?? 0);
        const currentPaid = Math.max(0, w.paidAmount ?? 0);
        const capacity = Math.max(0, due - currentPaid);

        if (capacity > 0) {
          const toAdd = Math.min(capacity, remainingToApply);
          const nextPaid = currentPaid + toAdd;
          remainingToApply -= toAdd;

          await updateWeeklyPayment(loan.id, w.weekNo, {
            status: nextPaid >= due && due > 0 ? 'paid' : 'pending',
            paidAmount: nextPaid,
          });
        }
      }

      const totalPaid = await computePaidAmountForLoan(loan.id);
      await setLoanPaidAmount(loan.id, totalPaid);
      onRefresh();
      refreshCurrentWeek();
      setCustomOpen(false);
    } catch {
      // ignore
    } finally {
      setSelectedMode(null);
    }
  };

  const segmentOffBg = isDark ? '#0E1216' : '#EDF1F4';
  const segmentOffText = isDark ? '#9BA1A6' : '#7A8590';

  return (
    <View style={[styles.loanCard, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
      <View style={styles.loanTopRow}>
        <View>
          <Text style={[styles.loanTitle, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>{loan.title}</Text>
          <Text style={[styles.loanAmount, { color: isDark ? '#ECEDEE' : '#101822' }]}>
            {formatPeso(loan.totalAmount)}
          </Text>
        </View>
        <MaterialIcons name="receipt-long" size={20} color={isDark ? '#C7D0D8' : '#6D7781'} />
      </View>

      <View style={styles.loanPctRow}>
        <Text style={[styles.loanPctLeft, { color: '#1FBF6A' }]}>{pct(progress * 100)} Paid</Text>
        <Text style={[styles.loanPctRight, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
          {pct((1 - progress) * 100)} Remaining
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#0E1216' : '#EAF0F3' }]}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.loanMiniRow}>
        <View style={[styles.miniBox, { backgroundColor: isDark ? '#0E1216' : '#F4F7F8' }]}>
          <Text style={[styles.miniLabel, { color: isDark ? '#77808A' : '#8C97A1' }]}>PAID</Text>
          <Text style={[styles.miniValue, { color: '#1FBF6A' }]}>{formatPeso(paid)}</Text>
        </View>
        <View style={[styles.miniBox, { backgroundColor: isDark ? '#0E1216' : '#F4F7F8' }]}>
          <Text style={[styles.miniLabel, { color: isDark ? '#77808A' : '#8C97A1' }]}>REMAINING</Text>
          <Text style={[styles.miniValue, { color: isDark ? '#ECEDEE' : '#101822' }]}>{formatPeso(remaining)}</Text>
        </View>
      </View>

      {currentWeek ? (
        <View style={styles.quickPayWrapper}>
          <Text style={[styles.quickPayLabel, { color: isDark ? '#77808A' : '#8C97A1' }]}>
            WEEK {currentWeek.weekNo} QUICK PAY ({formatPeso(currentWeek.dueAmount - (currentWeek.paidAmount ?? 0))} DUE)
          </Text>
          <View style={[styles.segmentWrap, { backgroundColor: segmentOffBg }]}>
            <Pressable
              onPress={() => onQuickPay('paid')}
              disabled={selectedMode != null}
              style={[
                styles.segment,
                selectedMode === 'paid' && { backgroundColor: '#1FBF6A' },
              ]}>
              <Text style={[styles.segmentText, { color: selectedMode === 'paid' ? '#FFFFFF' : segmentOffText }]}>
                Paid
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCustomOpen(!customOpen)}
              disabled={selectedMode != null}
              style={[
                styles.segment,
                (selectedMode === 'custom' || customOpen) && { backgroundColor: '#FF8A3D' },
              ]}>
              <Text style={[styles.segmentText, { color: (selectedMode === 'custom' || customOpen) ? '#FFFFFF' : segmentOffText }]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {customOpen && (
            <View style={styles.customRow}>
              <View style={[styles.customInput, { backgroundColor: isDark ? '#0E1216' : '#FFFFFF', borderColor: isDark ? '#141A20' : '#E6ECEF' }]}>
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
                onPress={() => onQuickPay('custom', Number(customText.replace(/[^0-9]/g, '')))}
                style={styles.applyButton}>
                <Text style={[styles.applyText, { fontFamily: Fonts.rounded }]}>Apply</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : remaining > 0 ? (
        <View style={styles.quickPayWrapper}>
           <Text style={[styles.quickPayLabel, { color: '#1FBF6A', textAlign: 'center' }]}>LOAN FULLY PAID IN WEEKS</Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push({ pathname: '/loan/[id]', params: { id: String(loan.id) } })}
        style={[
          styles.viewDetailsButton,
          {
            backgroundColor: isDark ? '#0E1216' : '#FFFFFF',
            borderColor: isDark ? '#141A20' : '#E6ECEF',
          },
        ]}>
        <Text style={[styles.viewDetailsText, { fontFamily: Fonts.rounded, color: isDark ? '#C7D0D8' : '#101822' }]}>View Details {'>'}</Text>
      </Pressable>
    </View>
  );
}


export default function BorrowerDetailsScreen() {
  const isDark = useColorScheme() === 'dark';
  const params = useLocalSearchParams<{ id?: string }>();
  const borrowerId = useMemo(() => Number(params.id), [params.id]);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);

  const refresh = useCallback(() => {
    let cancelled = false;

    (async () => {
      if (!Number.isFinite(borrowerId)) {
        if (!cancelled) setBorrower(null);
        if (!cancelled) setLoans([]);
        return;
      }

      try {
        const row = await getBorrowerById(borrowerId);
        const loanRows = await listLoansByBorrower(borrowerId);
        if (!cancelled) setBorrower(row);
        if (!cancelled) setLoans(loanRows);
      } catch {
        if (!cancelled) setBorrower(null);
        if (!cancelled) setLoans([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [borrowerId]);

  useFocusEffect(
    useCallback(() => {
      return refresh();
    }, [refresh])
  );

  const activeLoans = loans.filter((l) => l.status === 'active');
  const hasAnyLoan = loans.length > 0;
  const totalOwed = activeLoans.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalPaid = activeLoans.reduce((sum, l) => sum + l.paidAmount, 0);
  const totalRemaining = Math.max(0, totalOwed - totalPaid);

  const onDelete = async () => {
    if (!Number.isFinite(borrowerId)) return;

    Alert.alert(
      'Delete borrower?',
      'This will remove the borrower and all their loans from this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLoansByBorrower(borrowerId);
              await deleteBorrower(borrowerId);
              router.back();
            } catch {
              Alert.alert('Delete failed', 'Could not delete borrower. Please try again.');
            }
          },
        },
      ]
    );
  };

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

        <Text
          numberOfLines={1}
          style={[
            styles.headerTitle,
            { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#101822' },
          ]}>
          {borrower?.fullName ?? 'Borrower'}
        </Text>

        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            onPress={() => router.push({ pathname: '/borrower/edit', params: { id: String(borrowerId) } })}
            style={[styles.iconButton, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <MaterialIcons name="edit" size={20} color={isDark ? '#ECEDEE' : '#101822'} />
          </Pressable>

          <Pressable
            hitSlop={10}
            onPress={onDelete}
            style={[styles.iconButton, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.contactCard, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <View style={styles.contactRow}>
            <View style={[styles.contactIcon, { backgroundColor: isDark ? '#0E1216' : '#EEF2F5' }]}>
              <MaterialIcons name="call" size={18} color={isDark ? '#C7D0D8' : '#6D7781'} />
            </View>
            <View style={styles.contactText}>
              <Text style={[styles.contactLabel, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Phone Number</Text>
              <Text style={[styles.contactValue, { color: isDark ? '#ECEDEE' : '#101822' }]}>
                {(borrower?.phoneNumber ?? '').trim() || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.contactDivider} />

          <View style={styles.contactRow}>
            <View style={[styles.contactIcon, { backgroundColor: isDark ? '#0E1216' : '#EEF2F5' }]}>
              <MaterialIcons name="location-on" size={18} color={isDark ? '#C7D0D8' : '#6D7781'} />
            </View>
            <View style={styles.contactText}>
              <Text style={[styles.contactLabel, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Home Address</Text>
              <Text style={[styles.contactValue, { color: isDark ? '#ECEDEE' : '#101822' }]}>
                {(borrower?.homeAddress ?? '').trim() || '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#0F2A1C' : '#E7FAEF' }]}>
          <Text style={[styles.summaryLabel, { color: isDark ? '#A7DCC0' : '#1FBF6A' }]}>TOTAL OWED</Text>
          <Text style={[styles.summaryAmount, { color: isDark ? '#E7FFF2' : '#101822' }]}>
            {formatPeso(totalOwed)}
          </Text>

          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summarySmall, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Total Paid</Text>
              <Text style={[styles.summaryValue, { color: '#1FBF6A' }]}>{formatPeso(totalPaid)}</Text>
            </View>
            <View>
              <Text style={[styles.summarySmall, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#E7FFF2' : '#101822' }]}>
                {formatPeso(totalRemaining)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Active Loans</Text>
          <View style={[styles.activeChip, { backgroundColor: isDark ? '#0E1216' : '#E7FAEF' }]}>
            <Text style={[styles.activeChipText, { color: '#1FBF6A' }]}>{activeLoans.length} Active</Text>
          </View>
        </View>

        {activeLoans.map((l) => (
          <LoanPreviewCard key={l.id} loan={l} isDark={isDark} onRefresh={refresh} />
        ))}

        {!activeLoans.length && (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <Text style={[styles.emptyTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>No active loans</Text>
            <Text style={[styles.emptyBody, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
              Tap Add Loan to create the first loan.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View pointerEvents="box-none" style={styles.addLoanWrap}>
        <Pressable
          onPress={() => router.push({ pathname: '/loan/add', params: { borrowerId: String(borrowerId) } })}
          style={styles.addLoanButton}
          hitSlop={10}>
          <MaterialIcons name="add" size={18} color="#FFFFFF" />
          <Text style={[styles.addLoanText, { fontFamily: Fonts.rounded }]}>{hasAnyLoan ? 'Renew Loan' : 'Add Loan'}</Text>
        </Pressable>
      </View>
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
    flex: 1,
    textAlign: 'left',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
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
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  contactCard: {
    marginTop: 2,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  contactValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#E6ECEF',
    opacity: 0.6,
    marginVertical: 12,
    marginLeft: 46,
  },
  summaryCard: {
    marginTop: 12,
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
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  summaryAmount: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '900',
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summarySmall: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  activeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCard: {
    marginTop: 12,
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
  loanCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  loanTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  loanTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  loanAmount: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
  },
  loanPctRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loanPctLeft: {
    fontSize: 11,
    fontWeight: '900',
  },
  loanPctRight: {
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1FBF6A',
  },
  loanMiniRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  miniBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  miniValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '900',
  },
  viewDetailsButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECEF',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#101822',
  },
  bottomSpacer: {
    height: 92,
  },
  addLoanWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    paddingHorizontal: 18,
  },
  addLoanButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1FBF6A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  addLoanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  quickPayWrapper: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6ECEF',
    gap: 10,
  },
  quickPayLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '900',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6ECEF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customPeso: {
    fontSize: 14,
    fontWeight: '900',
  },
  customTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    paddingVertical: 0,
  },
  applyButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#1FBF6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
