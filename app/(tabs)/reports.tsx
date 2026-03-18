import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ReportsScreen() {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: isDark ? '#0E1216' : '#F3F6F7' }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#0E1620' }]}>
          Reports
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: isDark ? '#141A20' : '#FFFFFF' }]}>
        <MaterialIcons name="insights" size={22} color="#1FBF6A" />
        <Text
          style={[
            styles.cardTitle,
            { fontFamily: Fonts.rounded, color: isDark ? '#ECEDEE' : '#101822' },
          ]}>
          Coming soon
        </Text>
        <Text style={[styles.cardBody, { color: isDark ? '#9BA1A6' : '#7A8590' }]}>
          This tab will hold summaries and payment stats.
        </Text>
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
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0E1620',
  },
  card: {
    marginTop: 10,
    marginHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#101822',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A8590',
  },
});
