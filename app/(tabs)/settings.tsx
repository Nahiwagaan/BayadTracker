import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { getSettings, resetAllData, updateSetting } from '@/data/settings-db';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  
  const [principal, setPrincipal] = useState('5000');
  const [weeks, setWeeks] = useState('10');

  const computedInterest = useMemo(() => {
    const n = Number((principal || '').replace(/[^0-9]/g, ''));
    const principalValue = Number.isFinite(n) ? n : 0;
    return Math.round(principalValue * 0.2);
  }, [principal]);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setPrincipal(String(s.defaultPrincipal));
    setWeeks(String(s.defaultDuration));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const onUpdatePrincipal = async (val: string) => {
    setPrincipal(val);
    if (val.trim()) {
      const cleaned = val.replace(/[^0-9]/g, '');
      const n = Number(cleaned);
      const p = Number.isFinite(n) ? n : 0;
      await updateSetting('defaultPrincipal', String(p));
      // Keep compatibility for any code still reading this key.
      await updateSetting('defaultInterest', String(Math.round(p * 0.2)));
    }
  };

  const onUpdateDuration = async (val: string) => {
    setWeeks(val);
    if (val.trim()) {
      await updateSetting('defaultDuration', val.replace(/[^0-9]/g, ''));
    }
  };

  const onResetAll = () => {
    Alert.alert(
      'Delete All Data?',
      'This will permanently delete ALL borrowers, loans, and payments. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE ALL',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            Alert.alert('Success', 'All data has been cleared.');
            loadSettings();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
           <MaterialIcons name="arrow-back" size={24} color="#1FBF6A" />
        </Pressable>
        <Text style={[styles.title, { fontFamily: Fonts.rounded, color: '#1FBF6A' }]}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Loan Defaults</Text>
          <MaterialIcons name="account-balance" size={20} color={isDark ? '#1FBF6A' : '#6D7781'} />
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Default Principal</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#0E1216' : '#F4F7F8' }]}>
            <Text style={styles.inputIconText}>₱</Text>
            <TextInput
              value={principal}
              onChangeText={onUpdatePrincipal}
              keyboardType="numeric"
              style={[styles.input, { color: isDark ? '#ECEDEE' : '#101822' }]}
            />
          </View>

          <View style={styles.spacer} />

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Default Interest (Auto 20%)</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#0E1216' : '#F4F7F8' }]}> 
            <Text style={[styles.inputIconText, { color: '#1FBF6A' }]}>₱</Text>
            <Text style={[styles.input, styles.readOnlyInput, { color: isDark ? '#ECEDEE' : '#101822' }]}> 
              {computedInterest.toLocaleString()}
            </Text>
          </View>

          <View style={styles.spacer} />

          <Text style={[styles.label, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>Default Duration</Text>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#0E1216' : '#F4F7F8' }]}>
            <MaterialIcons name="calendar-today" size={18} color="#1FBF6A" style={styles.iconShift} />
            <TextInput
              value={weeks}
              onChangeText={onUpdateDuration}
              keyboardType="numeric"
              style={[styles.input, { color: isDark ? '#ECEDEE' : '#101822' }]}
            />
            <Text style={[styles.unitText, { color: isDark ? '#ECEDEE' : '#101822' }]}>Weeks</Text>
          </View>

          <Text style={[styles.hint, { color: isDark ? '#77808A' : '#89939D' }]}>
            These values will be automatically filled when you create a new loan.
          </Text>
        </View>

        <View style={[styles.sectionHead, { marginTop: 32 }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Data Management</Text>
          <MaterialIcons name="storage" size={20} color={isDark ? '#FF3B30' : '#6D7781'} />
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <Pressable
            onPress={onResetAll}
            style={({ pressed }) => [
              styles.resetButton,
              { borderColor: isDark ? '#FF3B30' : '#FF3B30', opacity: pressed ? 0.7 : 1 },
            ]}>
            <MaterialIcons name="delete-forever" size={20} color="#FF3B30" />
            <Text style={styles.resetButtonText}>Delete All Data</Text>
          </Pressable>

          <View style={[styles.warningBox, { backgroundColor: isDark ? '#1B1010' : '#FFF1F1' }]}>
            <MaterialIcons name="warning" size={18} color="#FF3B30" />
            <Text style={[styles.warningText, { color: isDark ? '#FFBDBD' : '#331111' }]}>
              This will permanently delete all borrowers and loan history. Use with caution.
            </Text>
          </View>
        </View>
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
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 100,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.rounded,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputWrap: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  inputIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1FBF6A',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  readOnlyInput: {
    paddingVertical: 12,
  },
  iconShift: {
    marginLeft: -2,
  },
  spacer: {
    height: 18,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  hint: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  resetButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '900',
  },
  warningBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
});
