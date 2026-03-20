import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { initBorrowersDb, listBorrowers, type Borrower } from '@/data/borrowers-db';
import { initLoansDb, listLoansByBorrower, type Loan } from '@/data/loans-db';
import { useColorScheme, useToggleColorScheme } from '@/hooks/use-color-scheme';

type BorrowerListItem = {
  borrower: Borrower;
  loan: Loan | null;
};

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

function Chip({ tone, label, isDark }: { tone: 'green' | 'orange' | 'gray'; label: string; isDark?: boolean }) {
  const toneMap = {
    green: isDark 
      ? { bg: '#1FBF6A', fg: '#FFFFFF' }
      : { bg: '#E7FAEF', fg: '#1FBF6A' },
    orange: isDark
      ? { bg: '#FF8A3D', fg: '#FFFFFF' }
      : { bg: '#FFF0E3', fg: '#FF8A3D' },
    gray: isDark
      ? { bg: '#2C353D', fg: '#ECEDEE' }
      : { bg: '#EDF1F4', fg: '#8D98A2' },
  } as const;

  const t = toneMap[tone];

  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.chipText, { color: t.fg, fontWeight: isDark && tone !== 'gray' ? '900' : '800' }]}>{label}</Text>
    </View>
  );
}

function BorrowerLoanCard({ item, isDark }: { item: BorrowerListItem; isDark: boolean }) {
  const loan = item.loan;
  const phone = (item.borrower.phoneNumber ?? '').trim();

  const total = loan?.totalAmount ?? 0;
  const paid = loan?.paidAmount ?? 0;
  const remaining = Math.max(0, total - paid);

  const weeks = loan?.durationWeeks ?? 0;
  const weekly = weeks > 0 ? total / weeks : 0;
  const paidWeeks = weeks > 0 && weekly > 0 ? Math.min(weeks, Math.floor(paid / weekly)) : 0;

  const isArchived = !loan || loan.status !== 'active';
  const chipLabel = isArchived ? 'Archived' : `${paidWeeks}/${weeks} Paid`;
  const chipTone: 'green' | 'orange' | 'gray' = isArchived
    ? 'gray'
    : paidWeeks > 0 && remaining > 0
      ? 'orange'
      : 'green';

  const remainingColor = remaining <= 0 ? '#1FBF6A' : '#FF3B30';

  const onOpen = () => {
    router.push({ pathname: '/borrower/[id]', params: { id: String(item.borrower.id) } });
  };

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: isDark ? '#141A20' : '#FFFFFF' },
        pressed ? { opacity: 0.92 } : null,
      ]}>
      <View style={styles.cardTopRow}>
        <Chip tone={chipTone} label={chipLabel} isDark={isDark} />
        <View style={styles.remainingWrap}>
          <Text style={[styles.remainingLabel, { color: isDark ? '#77808A' : '#A0AAB3' }]}>Remaining</Text>
          <Text style={[styles.remainingValue, { color: remainingColor }]}>{formatPeso(remaining)}</Text>
        </View>
      </View>

      <Text style={[styles.borrowerName, { color: isDark ? '#ECEDEE' : '#101822' }]}>{item.borrower.fullName}</Text>

      {!!phone && (
        <Text style={[styles.borrowerSub, { color: isDark ? '#9BA1A6' : '#86919B' }]} numberOfLines={1}>
          {phone}
        </Text>
      )}

      <View style={styles.cardBottomRow}>
        <Text style={[styles.totalLabel, { color: isDark ? '#9BA1A6' : '#86919B' }]}>Total: {formatPeso(total)}</Text>
        <Text style={styles.detailsLink}>Details {'>'}</Text>
      </View>
    </Pressable>
  );
}

export default function BorrowersScreen() {
  const colorScheme = useColorScheme();
  const toggleScheme = useToggleColorScheme();
  const isDark = colorScheme === 'dark';
  const tint = Colors[colorScheme ?? 'light'].tint;
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [items, setItems] = useState<BorrowerListItem[]>([]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => x.borrower.fullName.toLowerCase().includes(q));
  }, [items, query]);

  const activeCount = useMemo(() => items.filter((x) => x.loan?.status === 'active').length, [items]);

  const refresh = useCallback(() => {
    let cancelled = false;

    (async () => {
      try {
        await initBorrowersDb();
        await initLoansDb();

        const borrowers = await listBorrowers();
        const mapped: BorrowerListItem[] = [];

        for (const b of borrowers) {
          const loans = await listLoansByBorrower(b.id);
          const latest = loans[0] ?? null;
          mapped.push({ borrower: b, loan: latest });
        }

        mapped.sort((a, b) => {
          const aActive = a.loan?.status === 'active' ? 1 : 0;
          const bActive = b.loan?.status === 'active' ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          return b.borrower.id - a.borrower.id;
        });

        if (!cancelled) setItems(mapped);
      } catch {
        if (!cancelled) setItems([]);
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

  const renderItem: ListRenderItem<BorrowerListItem> = ({ item }) => (
    <BorrowerLoanCard item={item} isDark={isDark} />
  );

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' },
          ]}>
          Borrowers
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

      <View style={[styles.searchBar, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
        <MaterialIcons name="search" size={18} color={tint} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search borrowers by name..."
          placeholderTextColor={isDark ? '#8A9299' : '#9AA4AD'}
          style={[styles.searchInput, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#77808A' : '#89939D' }]}>ACTIVE LOANS</Text>
        <Text style={[styles.sectionTotal, { color: tint }]}>{activeCount} Total</Text>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.borrower.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View pointerEvents="box-none" style={styles.addBorrowerWrap}>
        <Pressable
          onPress={() => router.push({ pathname: '/borrower/add' })}
          style={[styles.addBorrowerPill, isDark && { backgroundColor: '#1FBF6A', shadowOpacity: 0.3 }]}
          hitSlop={10}>
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={[styles.addBorrowerText, { fontFamily: Fonts.rounded }]}>Add Borrower</Text>
        </Pressable>
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
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0E1620',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  searchBar: {
    marginHorizontal: 18,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0E1620',
    backgroundColor: 'transparent',
  },
  sectionRow: {
    marginTop: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#89939D',
  },
  sectionTotal: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 140,
  },
  addBorrowerWrap: {
    position: 'absolute',
    right: 0,
    bottom: 90,
    paddingRight: 18,
    alignItems: 'flex-end',
  },
  addBorrowerPill: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: '#1FBF6A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  addBorrowerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  remainingWrap: {
    alignItems: 'flex-end',
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0AAB3',
    marginBottom: 2,
  },
  remainingValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  borrowerName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#101822',
  },
  borrowerSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#86919B',
  },
  detailsLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1FBF6A',
  },
});
