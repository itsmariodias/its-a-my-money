import React, { useRef, useEffect, useState } from 'react';
import { Animated, BackHandler, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useSegments, withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import AddTransactionSheet from '@/components/AddTransactionSheet';
import SettingsScreen from '@/components/SettingsScreen';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getColors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HEADER_HEIGHT = 52;

const { Navigator } = createMaterialTopTabNavigator();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MaterialTabs = withLayoutContext(Navigator) as any;

const TABS = [
  { name: 'index',        href: '/',             icon: 'pie-chart',              label: 'Dashboard',     title: "It's a My Money!" },
  { name: 'transactions', href: '/transactions',  icon: 'format-list-bulleted',   label: 'Transactions',  title: 'Transactions' },
  { name: 'accounts',     href: '/accounts',      icon: 'account-balance-wallet', label: 'Accounts',      title: 'Accounts' },
] as const;

const TAB_BAR_HEIGHT = 56;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomPager({ navigationState, onIndexChange, layout, children, position }: any) {
  const screenWidth = layout.width > 0 ? layout.width : Dimensions.get('window').width;
  const numTabs = navigationState.routes.length;

  const translateX = useRef(new Animated.Value(-navigationState.index * screenWidth)).current;
  const indexRef = useRef<number>(navigationState.index);
  const positionXRef = useRef<number>(-navigationState.index * screenWidth);

  // Keep callback refs fresh so the PanResponder closure never goes stale
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const positionRef = useRef(position);
  positionRef.current = position;

  // Sync position when the tab changes via the bottom tab bar
  useEffect(() => {
    const target = -navigationState.index * screenWidth;
    if (indexRef.current !== navigationState.index) {
      indexRef.current = navigationState.index;
      positionXRef.current = target;
      Animated.spring(translateX, {
        toValue: target,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationState.index, screenWidth]);

  const panResponder = useRef(
    PanResponder.create({
      // Capture horizontal swipes before children can claim them
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const absDx = Math.abs(g.dx);
        const absDy = Math.abs(g.dy);
        if (absDy >= absDx) return false;
        // At boundary tabs, intercept any horizontal intent early so inner views
        // never get a chance to rubber-band / overscroll
        const atStart = indexRef.current === 0 && g.dx > 0;
        const atEnd = indexRef.current === TABS.length - 1 && g.dx < 0;
        if (atStart || atEnd) return absDx > 4;
        // Mid-tabs: require a clear horizontal intent — same feel as Android launcher
        return absDx > 12 && absDx > absDy * 2.5;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        translateX.setValue(positionXRef.current);
      },
      onPanResponderMove: (_, g) => {
        const next = Math.max(
          -(TABS.length - 1) * screenWidth,
          Math.min(0, positionXRef.current + g.dx),
        );
        translateX.setValue(next);
        if (positionRef.current) {
          positionRef.current.setValue(-next / screenWidth);
        }
      },
      onPanResponderRelease: (_, g) => {
        const idx = indexRef.current;
        // Android launcher feel: need 40% drag OR a fast flick to switch
        const threshold = screenWidth * 0.4;
        let nextIdx = idx;
        if (g.dx < -threshold && idx < TABS.length - 1) {
          nextIdx = idx + 1;
        } else if (g.dx > threshold && idx > 0) {
          nextIdx = idx - 1;
        }

        const target = -nextIdx * screenWidth;
        positionXRef.current = target;
        indexRef.current = nextIdx;

        Animated.spring(translateX, {
          toValue: target,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }).start();

        if (positionRef.current) {
          Animated.spring(positionRef.current, {
            toValue: nextIdx,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            useNativeDriver: false as any,
            bounciness: 0,
            speed: 20,
          }).start();
        }

        if (nextIdx !== idx) {
          onIndexChangeRef.current(nextIdx);
        }
      },
      onPanResponderTerminate: () => {
        const target = -indexRef.current * screenWidth;
        positionXRef.current = target;
        Animated.spring(translateX, {
          toValue: target,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
      <Animated.View
        style={{
          flex: 1,
          flexDirection: 'row',
          width: screenWidth * numTabs,
          transform: [{ translateX }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { bg, textColor, borderColor } = getColors(isDark);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const openAddTx = useUIStore((s) => s.openAddTx);
  const isAddTxOpen = useUIStore((s) => s.isAddTxOpen);
  const closeAddTx = useUIStore((s) => s.closeAddTx);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const currentTab = segments[segments.length - 1];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsTranslateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const settingsOpenRef = useRef(false);
  const closeSettingsRef = useRef<() => void>(() => {});
  settingsOpenRef.current = settingsOpen;

  const openSettings = () => {
    setSettingsOpen(true);
    settingsTranslateX.setValue(SCREEN_WIDTH);
    Animated.spring(settingsTranslateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14 }).start();
  };
  const closeSettings = () => {
    Animated.timing(settingsTranslateX, { toValue: SCREEN_WIDTH, duration: 220, useNativeDriver: true })
      .start(() => setSettingsOpen(false));
  };
  closeSettingsRef.current = closeSettings;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!settingsOpenRef.current) return false;
      closeSettingsRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const showFab = !settingsOpen;
  const fabBottom = TAB_BAR_HEIGHT + insets.bottom + 12;

  const currentTitle = TABS.find((t) => t.name === currentTab)?.title ?? "It's a My Money!";

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>{currentTitle}</Text>
        <TouchableOpacity onPress={openSettings} hitSlop={8}>
          <MaterialIcons name="settings" size={24} color={textColor} />
        </TouchableOpacity>
      </View>
      <MaterialTabs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderPager={(props: any) => <CustomPager {...props} />}
        screenOptions={{
          // Hide the material top tab bar — we render our own at the bottom
          tabBarStyle: { height: 0, overflow: 'hidden' },
          tabBarIndicatorStyle: { display: 'none' },
        }}
      >
        <MaterialTabs.Screen name="index"        options={{ title: "It's a My Money!" }} />
        <MaterialTabs.Screen name="transactions" options={{ title: 'Transactions' }} />
        <MaterialTabs.Screen name="accounts"     options={{ title: 'Accounts' }} />
      </MaterialTabs>

      {/* Custom bottom tab bar */}
      {!settingsOpen && <View style={[styles.tabBar, { backgroundColor: bg, borderTopColor: borderColor, height: TAB_BAR_HEIGHT + insets.bottom }]}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.name || (tab.name === 'index' && currentTab === '(tabs)');
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.navigate(tab.href as any)}
              activeOpacity={0.7}
            >
              <MaterialIcons name={tab.icon as any} size={24} color={isActive ? accentColor : textColor} />
              <Text style={{ fontSize: 10, color: isActive ? accentColor : textColor, marginTop: 2 }}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>}

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

      {/* Settings overlay — slides in from the right, includes its own header */}
      <Animated.View style={[styles.settingsOverlay, { backgroundColor: bg, top: insets.top, transform: [{ translateX: settingsTranslateX }] }]}>
        <View style={[styles.header, { backgroundColor: bg, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={closeSettings} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor, marginLeft: 8 }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <SettingsScreen />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
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
