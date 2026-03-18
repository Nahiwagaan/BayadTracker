import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { deleteBorrower, getBorrowerById, type Borrower } from '@/data/borrowers-db';
import { deleteLoansByBorrower, listLoansByBorrower, type Loan } from '@/data/loans-db';
import { useColorScheme } from '@/hooks/use-color-scheme';

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

function pct(n: number) {
  return `${Math.round(Math.max(0, Math.min(100, n)))}%`;
}

function LoanPreviewCard({ loan, isDark }: { loan: Loan; isDark: boolean }) {
  const paid = Math.max(0, loan.paidAmount);
  const remaining = Math.max(0, loan.totalAmount - paid);
  const progress = loan.totalAmount > 0 ? Math.min(1, Math.max(0, paid / loan.totalAmount)) : 0;

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

      <Pressable
        onPress={() => router.push({ pathname: '/loan/[id]', params: { id: String(loan.id) } })}
        style={styles.viewDetailsButton}>
        <Text style={[styles.viewDetailsText, { fontFamily: Fonts.rounded }]}>View Details {'>'}</Text>
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
  const totalOwed = activeLoans.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalPaid = activeLoans.reduce((sum, l) => sum + l.paidAmount, 0);
  const totalRemaining = Math.max(0, totalOwed - totalPaid);

  const onDelete = async () => {
    if (!Number.isFinite(borrowerId)) return;
    try {
      await deleteLoansByBorrower(borrowerId);
      await deleteBorrower(borrowerId);
      router.back();
    } catch {
      // ignore for now
    }
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

        <Pressable
          hitSlop={10}
          onPress={onDelete}
          style={[styles.iconButton, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <LoanPreviewCard key={l.id} loan={l} isDark={isDark} />
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
          <Text style={[styles.addLoanText, { fontFamily: Fonts.rounded }]}>Add Loan</Text>
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
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 12,
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
});
