import { useEffect, useRef } from 'react';
import { PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import AddTransactionSheet from '@/components/AddTransactionSheet';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getColors } from '@/constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { bg, textColor, borderColor } = getColors(isDark);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const headerShown = useClientOnlyValue(false, true);
  const openAddTx = useUIStore((s) => s.openAddTx);
  const isAddTxOpen = useUIStore((s) => s.isAddTxOpen);
  const closeAddTx = useUIStore((s) => s.closeAddTx);
  const insets = useSafeAreaInsets();
  const fabBottom = 49 + insets.bottom + 12;
  const router = useRouter();
  const segments = useSegments();
  const currentTab = segments[segments.length - 1];
  const showFab = currentTab !== 'settings';

  const TAB_ROUTES = ['index', 'transactions', 'accounts', 'settings'];
  const TAB_HREFS = ['/', '/transactions', '/accounts', '/settings'];
  const currentTabIdxRef = useRef(0);
  useEffect(() => {
    currentTabIdxRef.current = TAB_ROUTES.indexOf(currentTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  const swipePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 30 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
    onPanResponderRelease: (_, g) => {
      const idx = currentTabIdxRef.current;
      if (g.vx < -0.4 && idx < TAB_ROUTES.length - 1) {
        router.navigate(TAB_HREFS[idx + 1] as any);
      } else if (g.vx > 0.4 && idx > 0) {
        router.navigate(TAB_HREFS[idx - 1] as any);
      }
    },
  })).current;

  return (
    <View style={{ flex: 1 }} {...swipePan.panHandlers}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: accentColor,
          tabBarStyle: { backgroundColor: bg, borderTopColor: borderColor },
          headerShown,
          headerStyle: { backgroundColor: bg },
          headerTintColor: textColor,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "It's a My Money!",
            tabBarIcon: ({ color }) => <MaterialIcons name="pie-chart" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color }) => <MaterialIcons name="format-list-bulleted" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="accounts"
          options={{
            title: 'Accounts',
            tabBarIcon: ({ color }) => <MaterialIcons name="account-balance-wallet" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={26} color={color} />,
          }}
        />
      </Tabs>
      {showFab && (
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom, backgroundColor: accentColor }]}
          onPress={openAddTx}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      <AddTransactionSheet isOpen={isAddTxOpen} onClose={closeAddTx} />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
