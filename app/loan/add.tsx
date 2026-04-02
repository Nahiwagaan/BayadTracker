import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { getBorrowerById } from '@/data/borrowers-db';
import { createLoan } from '@/data/loans-db';
import { getSettings } from '@/data/settings-db';
import { ensureWeeklyPaymentsForLoan } from '@/data/weekly-payments-db';
import { useColorScheme } from '@/hooks/use-color-scheme';

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

function formatMoney(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₱${n.toFixed(2)}`;
}

function parseIntSafe(s: string) {
  const cleaned = s.replace(/[^0-9]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function MoneyPill({ isDark }: { isDark: boolean }) {
  return (
    <View style={[styles.moneyPill, { backgroundColor: isDark ? '#0E1216' : '#E7FAEF' }]}>
      <Text style={[styles.moneyPillText, { color: '#1FBF6A' }]}>₱</Text>
    </View>
  );
}

export default function AddLoanScreen() {
  const isDark = useColorScheme() === 'dark';
  const params = useLocalSearchParams<{ borrowerId?: string }>();
  const borrowerId = Number(params.borrowerId);

  const [borrowerName, setBorrowerName] = useState<string>('');

  const [principal, setPrincipal] = useState('5000');
  const [weeks, setWeeks] = useState('10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const principalRef = useRef<TextInput>(null);
  const weeksRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(borrowerId)) return;
      try {
        const b = await getBorrowerById(borrowerId);
        if (!cancelled) setBorrowerName(b?.fullName ?? '');
        
        // Load defaults
        const s = await getSettings();
        if (!cancelled) {
          setPrincipal(String(s.defaultPrincipal));
          setWeeks(String(s.defaultDuration));
        }
      } catch {
        if (!cancelled) setBorrowerName('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [borrowerId]);

  const principalAmount = useMemo(() => parseIntSafe(principal), [principal]);
  const interestAmount = useMemo(() => Math.round(principalAmount * 0.2), [principalAmount]);
  const durationWeeks = useMemo(() => Math.max(1, parseIntSafe(weeks)), [weeks]);
  const totalAmount = principalAmount + interestAmount;
  const weeklyPayment = durationWeeks > 0 ? totalAmount / durationWeeks : 0;

  const canSave = useMemo(() => {
    return principalAmount > 0 && durationWeeks > 0 && Number.isFinite(borrowerId);
  }, [principalAmount, durationWeeks, borrowerId]);

  const onSave = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      setError(null);

      const loanId = await createLoan({ borrowerId, principalAmount, interestAmount, durationWeeks });
      await ensureWeeklyPaymentsForLoan(loanId, principalAmount + interestAmount, durationWeeks);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create loan');
    } finally {
      setSaving(false);
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
          style={[styles.headerTitle, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#101822' }]}>
          New Loan{borrowerName ? ` for ${borrowerName}` : ''}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Loan Details</Text>

        <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>PRINCIPAL AMOUNT</Text>
        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF', borderColor: '#DFF3E9' }]}>
          <MoneyPill isDark={isDark} />
          <TextInput
            ref={principalRef}
            value={principal}
            onChangeText={setPrincipal}
            placeholder="0"
            placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
            style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
            keyboardType="numeric"
            returnKeyType="next"
            onSubmitEditing={() => weeksRef.current?.focus()}
          />
          <MaterialIcons name="payments" size={18} color="#1FBF6A" />
        </View>

        <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>INTEREST AMOUNT (AUTO 20%)</Text>
        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF', borderColor: '#DFF3E9' }]}> 
          <MoneyPill isDark={isDark} />
          <Text style={[styles.input, styles.inputReadOnly, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}>
            {interestAmount.toLocaleString()}
          </Text>
          <MaterialIcons name="trending-up" size={18} color="#1FBF6A" />
        </View>

        <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>DURATION (WEEKS)</Text>
        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF', borderColor: '#DFF3E9' }]}>
          <View style={[styles.moneyPill, { backgroundColor: isDark ? '#0E1216' : '#EDF1F4' }]}>
            <Text style={[styles.moneyPillText, { color: isDark ? '#C7D0D8' : '#6D7781' }]}>#</Text>
          </View>
          <TextInput
            ref={weeksRef}
            value={weeks}
            onChangeText={setWeeks}
            placeholder="10"
            placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
            style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
            keyboardType="numeric"
            returnKeyType="done"
          />
          <MaterialIcons name="calendar-month" size={18} color="#1FBF6A" />
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#0F2A1C' : '#E7FAEF' }]}>
          <Text style={[styles.summaryHeader, { color: isDark ? '#A7DCC0' : '#1FBF6A' }]}>LOAN SUMMARY</Text>
          <View style={styles.summaryTop}>
            <View>
              <Text style={[styles.summaryLabel, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Total Amount</Text>
              <Text style={[styles.summaryAmount, { color: isDark ? '#E7FFF2' : '#101822' }]}>{formatPeso(totalAmount)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Repayment Term</Text>
              <Text style={[styles.summaryTerm, { color: isDark ? '#E7FFF2' : '#101822' }]}>Weekly</Text>
            </View>
          </View>
          <View style={styles.summaryBottom}>
            <View>
              <Text style={[styles.summaryLabel, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Payment Due Every Week</Text>
              <Text style={[styles.summaryPayment, { color: '#1FBF6A' }]}>{formatMoney(weeklyPayment)}</Text>
            </View>
            <View style={[styles.summaryCheck, { backgroundColor: '#1FBF6A' }]}>
              <MaterialIcons name="check" size={18} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={[styles.note, { backgroundColor: isDark ? '#141A20' : '#EEF2F5' }]}>
          <MaterialIcons name="info" size={18} color={isDark ? '#9BA1A6' : '#7A8590'} />
          <Text style={[styles.noteText, { color: isDark ? '#9BA1A6' : '#7A8590' }]}> 
            By clicking Create Loan, you agree to the repayment schedule of {formatMoney(weeklyPayment)} per week for {durationWeeks} weeks starting from the disbursement date.
          </Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          disabled={!canSave || saving}
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={onSave}>
          <MaterialIcons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={[styles.saveText, { fontFamily: Fonts.rounded }]}>
            {saving ? 'Creating...' : 'Create Loan'}
          </Text>
        </Pressable>

        <View style={{ height: 20 }} />
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
    fontWeight: '900',
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  label: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  inputWrap: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  moneyPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moneyPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  inputReadOnly: {
    fontWeight: '800',
  },
  summaryCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
  },
  summaryHeader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  summaryTop: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryBottom: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryAmount: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
  },
  summaryTerm: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryPayment: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
  },
  summaryCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '800',
    color: '#FF3B30',
  },
  saveButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1FBF6A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
