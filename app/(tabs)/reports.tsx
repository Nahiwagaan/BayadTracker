import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useColorScheme, useToggleColorScheme } from '@/hooks/use-color-scheme';
import { formatMissedWeeks, getReportsSnapshot, type ReportsSnapshot } from '@/data/reports-db';

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

function InitialAvatar({ name }: { name: string }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const toggleScheme = useToggleColorScheme();
  const isDark = colorScheme === 'dark';
  const [snap, setSnap] = useState<ReportsSnapshot | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getReportsSnapshot();
        if (!cancelled) setSnap(s);
      } catch {
        if (!cancelled) setSnap(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return refresh();
    }, [refresh])
  );

  const collectPendingCount = snap?.collectToday.length ?? 0;

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}>
          Reports
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            onPress={toggleScheme}
            style={[styles.iconButton, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <MaterialIcons
              name={colorScheme === 'dark' ? 'light-mode' : 'dark-mode'}
              size={22}
              color={isDark ? '#C7D0D8' : '#6D7781'}
            />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => router.push('/settings')}
            style={[styles.iconButton, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
            <MaterialIcons name="tune" size={22} color={isDark ? '#C7D0D8' : '#6D7781'} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.bigStat, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
        <View style={styles.bigStatAccent} />
        <View style={styles.bigStatBody}>
          <Text style={[styles.statLabel, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>TOTAL LOANED</Text>
          <Text style={[styles.bigStatValue, { color: isDark ? '#ECEDEE' : '#101822' }]}>
            {formatPeso(snap?.totalLoaned ?? 0)}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={[styles.smallStat, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <View style={[styles.smallAccent, { backgroundColor: '#1FBF6A' }]} />
          <View>
            <Text style={[styles.statLabel, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>TOTAL COLLECTED</Text>
            <Text style={[styles.smallStatValue, { color: '#1FBF6A' }]}>{formatPeso(snap?.totalCollected ?? 0)}</Text>
          </View>
        </View>
        <View style={[styles.smallStat, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
          <View style={[styles.smallAccent, { backgroundColor: '#FF3B30' }]} />
          <View>
            <Text style={[styles.statLabel, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>REMAINING</Text>
            <Text style={[styles.smallStatValue, { color: '#FF3B30' }]}>{formatPeso(snap?.totalRemaining ?? 0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Collect Today</Text>
        <View style={[styles.chip, { backgroundColor: isDark ? '#1FBF6A' : '#E7FAEF' }]}>
          <Text style={[styles.chipText, { color: isDark ? '#FFFFFF' : '#1FBF6A' }]}>{collectPendingCount} Pending</Text>
        </View>
      </View>

      <View style={styles.list}>
        {(snap?.collectToday ?? []).slice(0, 6).map((it) => (
          <Pressable
            key={`${it.loanId}-${it.weekNo}`}
            onPress={() => router.push({ pathname: '/loan/[id]', params: { id: String(it.loanId) } })}
            style={({ pressed }) => [
              styles.rowCard,
              { backgroundColor: isDark ? '#141A20' : '#FFFFFF' },
              pressed ? { opacity: 0.92 } : null,
            ]}>
            <InitialAvatar name={it.borrowerName} />
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: isDark ? '#ECEDEE' : '#101822' }]}>{it.borrowerName}</Text>
              <Text style={[styles.rowSub, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
                Week {it.weekNo} • {formatPeso(it.amountDue)}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: isDark ? '#FF3B30' : '#FFF1F1' }]}>
              <Text style={[styles.pillText, { color: isDark ? '#FFFFFF' : '#FF3B30' }]}>UNPAID</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#ECEDEE' : '#101822' }]}>Outstanding Unpaid</Text>
      </View>

      <View style={styles.list}>
        {(snap?.outstandingUnpaid ?? []).slice(0, 6).map((it) => (
          <Pressable
            key={it.borrowerId}
            onPress={() => router.push({ pathname: '/borrower/[id]', params: { id: String(it.borrowerId) } })}
            style={({ pressed }) => [
              styles.rowCard,
              { backgroundColor: isDark ? '#141A20' : '#FFFFFF' },
              pressed ? { opacity: 0.92 } : null,
            ]}>
            <View style={[styles.missedIcon, { backgroundColor: isDark ? '#1B1010' : '#FFF1F1' }]}>
              <MaterialIcons name="error-outline" size={18} color="#FF3B30" />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowName, { color: isDark ? '#ECEDEE' : '#101822' }]}>{it.borrowerName}</Text>
              <Text style={[styles.rowSub, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>{formatMissedWeeks(it.missedWeeks)}</Text>
            </View>
            <Text style={[styles.missedCount, { color: '#FF3B30' }]}>{it.missedCount} MISSED</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F6F7',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0E1620',
  },
  bigStat: {
    marginHorizontal: 18,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bigStatAccent: {
    width: 4,
    height: 46,
    borderRadius: 2,
    backgroundColor: '#1FBF6A',
    marginRight: 12,
  },
  bigStatBody: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  bigStatValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
  },
  statRow: {
    marginTop: 10,
    marginHorizontal: 18,
    flexDirection: 'row',
    gap: 12,
  },
  smallStat: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  smallAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  smallStatValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHead: {
    marginTop: 16,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  list: {
    marginTop: 10,
    marginHorizontal: 18,
    gap: 10,
  },
  rowCard: {
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '900',
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7FAEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1FBF6A',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  missedIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedCount: {
    fontSize: 11,
    fontWeight: '900',
  },
});
