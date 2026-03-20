import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: isDark ? '#6E7781' : '#A6AFB7',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#0E1216' : '#FFFFFF',
          borderTopWidth: isDark ? 1 : 0,
          borderTopColor: isDark ? '#141A20' : 'transparent',
          height: 78,
          paddingTop: 10,
          paddingBottom: 14,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.2 : 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -6 },
          elevation: isDark ? 10 : 18,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Borrowers',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
