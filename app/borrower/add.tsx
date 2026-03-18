import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { createBorrower } from '@/data/borrowers-db';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AddBorrowerScreen() {
  const isDark = useColorScheme() === 'dark';
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => fullName.trim().length > 0, [fullName]);

  const onSave = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      setError(null);
      await createBorrower({ fullName, phoneNumber, homeAddress });
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

      <View style={styles.content}>
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

        {!!error && (
          <Text style={[styles.errorText, { color: '#FF3B30' }]}>{error}</Text>
        )}

        <Pressable
          disabled={!canSave || saving}
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={onSave}>
          <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
          <Text style={[styles.saveText, { fontFamily: Fonts.rounded }]}>
            {saving ? 'Saving...' : 'Save Borrower'}
          </Text>
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
    marginTop: 18,
    height: 44,
    borderRadius: 14,
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
