import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { createBorrower } from '@/data/borrowers-db';
import { createLoan } from '@/data/loans-db';
import { getSettings } from '@/data/settings-db';
import { ensureWeeklyPaymentsForLoan } from '@/data/weekly-payments-db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect } from '@react-navigation/native';

function parseIntSafe(s: string) {
  const cleaned = s.replace(/[^0-9]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

export default function AddBorrowerScreen() {
  const isDark = useColorScheme() === 'dark';
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

  // Optional: create first loan while adding borrower.
  const [principal, setPrincipal] = useState('5000');
  const [interest, setInterest] = useState('1000');
  const [weeks, setWeeks] = useState('10');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getSettings();
        setPrincipal(String(s.defaultPrincipal));
        setInterest(String(s.defaultInterest));
        setWeeks(String(s.defaultDuration));
      })();
    }, [])
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const principalAmount = useMemo(() => parseIntSafe(principal), [principal]);
  const interestAmount = useMemo(() => parseIntSafe(interest), [interest]);
  const durationWeeks = useMemo(() => Math.max(1, parseIntSafe(weeks) || 10), [weeks]);
  const totalAmount = principalAmount + interestAmount;
  const weeklyPayment = durationWeeks > 0 ? totalAmount / durationWeeks : 0;

  const willCreateLoan = principalAmount > 0;
  const canSave = useMemo(() => {
    if (fullName.trim().length === 0) return false;
    if (!willCreateLoan) return true;
    return interestAmount >= 0 && durationWeeks > 0;
  }, [durationWeeks, fullName, interestAmount, willCreateLoan]);

  const onSave = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      setError(null);

      const borrowerId = await createBorrower({ fullName, phoneNumber, homeAddress });

      if (willCreateLoan) {
        const loanId = await createLoan({
          borrowerId,
          principalAmount,
          interestAmount,
          durationWeeks,
        });
        await ensureWeeklyPaymentsForLoan(loanId, principalAmount + interestAmount, durationWeeks);
      }

      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save borrower');
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

        <Text style={[styles.headerTitle, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#101822' }]}>
          Add Borrower
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter name"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Phone Number</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <MaterialIcons name="call" size={18} color={isDark ? '#C7D0D8' : '#6D7781'} />
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter phone number"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Home Address</Text>
          <View
            style={[
              styles.inputWrap,
              styles.inputWrapMultiline,
              { backgroundColor: isDark ? '#141A20' : '#FFFFFF' },
            ]}>
            <MaterialIcons name="location-on" size={18} color={isDark ? '#C7D0D8' : '#6D7781'} />
            <TextInput
              value={homeAddress}
              onChangeText={setHomeAddress}
              placeholder="Enter address"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[
                styles.input,
                styles.inputMultiline,
                { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' },
              ]}
              multiline
              textAlignVertical="top"
            />
          </View>

          {!!error && <Text style={[styles.errorText, { color: '#FF3B30' }]}>{error}</Text>}

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Loan (Optional)</Text>
          <Text style={[styles.hint, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
            Fill this out to create the first loan automatically. You can renew later.
          </Text>

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Principal Amount</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <Text style={[styles.prefix, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>₱</Text>
            <TextInput
              value={principal}
              onChangeText={setPrincipal}
              placeholder="0"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Interest Amount</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <Text style={[styles.prefix, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>₱</Text>
            <TextInput
              value={interest}
              onChangeText={setInterest}
              placeholder="0"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Duration (Weeks)</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <Text style={[styles.prefix, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>#</Text>
            <TextInput
              value={weeks}
              onChangeText={setWeeks}
              placeholder="10"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>

          {willCreateLoan && (
            <View style={[styles.loanSummary, { backgroundColor: isDark ? '#0F2A1C' : '#E7FAEF' }]}>
              <Text style={[styles.loanSummaryTitle, { color: isDark ? '#A7DCC0' : '#1FBF6A' }]}>LOAN SUMMARY</Text>

              <View style={styles.loanSummaryTop}>
                <View style={styles.loanSummaryCol}>
                  <Text style={[styles.loanSummaryLabel, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Total Amount</Text>
                  <Text style={[styles.loanSummaryAmount, { color: isDark ? '#E7FFF2' : '#101822' }]}>
                    {formatPeso(totalAmount)}
                  </Text>
                </View>

                <View style={[styles.loanSummaryCol, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.loanSummaryLabel, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Repayment Term</Text>
                  <Text style={[styles.loanSummaryTerm, { color: isDark ? '#E7FFF2' : '#101822' }]}>Weekly</Text>
                </View>
              </View>

              <View style={[styles.loanSummaryDivider, { backgroundColor: isDark ? '#1B3A29' : '#DFF3E9' }]} />

              <View style={styles.loanSummaryBottom}>
                <View>
                  <Text style={[styles.loanSummaryLabel, { color: isDark ? '#B6D7C5' : '#7A8590' }]}>Payment Due Every Week</Text>
                  <Text style={[styles.loanSummaryPayment, { color: '#1FBF6A' }]}>
                    {`₱${weeklyPayment.toFixed(2)}`}
                  </Text>
                </View>

                <View style={styles.loanSummaryBadgeShadow}>
                  <View style={styles.loanSummaryBadge}>
                    <MaterialIcons name="verified" size={18} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]}>
          <Pressable
            disabled={!canSave || saving}
            style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
            onPress={onSave}>
            <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
            <Text style={[styles.saveText, { fontFamily: Fonts.rounded }]}>
              {saving ? 'Saving...' : willCreateLoan ? 'Save Borrower & Create Loan' : 'Save Borrower'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
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
  },
  label: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '900',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  divider: {
    marginTop: 18,
    height: 1,
    backgroundColor: '#E6ECEF',
    opacity: 0.8,
  },
  prefix: {
    width: 14,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
  },
  required: {
    color: '#FF3B30',
  },
  inputWrap: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
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
  input: {
    flex: 1,
    fontSize: 14,
  },
  inputWrapMultiline: {
    height: 96,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  inputMultiline: {
    height: '100%',
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
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
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  loanSummary: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
  },
  loanSummaryTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  loanSummaryLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  loanSummaryTop: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loanSummaryCol: {
    flex: 1,
  },
  loanSummaryAmount: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
  },
  loanSummaryTerm: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '900',
  },
  loanSummaryDivider: {
    marginTop: 14,
    height: 1,
    borderRadius: 1,
  },
  loanSummaryBottom: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  loanSummaryPayment: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '900',
  },
  loanSummaryBadgeShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  loanSummaryBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1FBF6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
