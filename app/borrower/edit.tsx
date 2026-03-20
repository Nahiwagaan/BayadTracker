import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { getBorrowerById, updateBorrower } from '@/data/borrowers-db';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EditBorrowerScreen() {
  const isDark = useColorScheme() === 'dark';
  const params = useLocalSearchParams<{ id: string }>();
  const borrowerId = Number(params.id);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!borrowerId) return;
      try {
        const b = await getBorrowerById(borrowerId);
        if (b) {
          setFullName(b.fullName);
          setPhoneNumber(b.phoneNumber ?? '');
          setHomeAddress(b.homeAddress ?? '');
        }
      } catch (e) {
        setError('Failed to load borrower');
      } finally {
        setLoading(false);
      }
    })();
  }, [borrowerId]);

  const onSave = async () => {
    if (!fullName.trim() || saving) return;

    try {
      setSaving(true);
      setError(null);
      await updateBorrower(borrowerId, { fullName, phoneNumber, homeAddress });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update borrower');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

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
          Edit Borrower
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Full Name</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter name"
              placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
              style={[styles.input, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
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

          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]}>
          <Pressable
            disabled={!fullName.trim() || saving}
            style={[styles.saveButton, (!fullName.trim() || saving) && styles.saveButtonDisabled]}
            onPress={onSave}>
            <MaterialIcons name="check" size={20} color="#FFFFFF" />
            <Text style={[styles.saveText, { fontFamily: Fonts.rounded }]}>
              {saving ? 'Updating...' : 'Update Borrower'}
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
  inputWrap: {
    marginTop: 10,
    height: 48,
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
    color: '#FF3B30',
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
});
