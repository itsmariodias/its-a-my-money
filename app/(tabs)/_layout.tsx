import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Animated, BackHandler, Dimensions, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useSegments, withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/shared/components/useColorScheme';
import AccountIcon from '@/shared/components/AccountIcon';
import AddTransactionSheet from '@/features/transactions/AddTransactionSheet';
import TransferSheet from '@/features/transfers/TransferSheet';
import SettingsScreen from '@/features/settings/SettingsScreen';
import { useUIStore } from '@/shared/store/useUIStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
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
  const openTransfer = useUIStore((s) => s.openTransfer);
  const isTransferOpen = useUIStore((s) => s.isTransferOpen);
  const closeTransfer = useUIStore((s) => s.closeTransfer);
  const selectedAccountId = useUIStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useUIStore((s) => s.setSelectedAccountId);
  const accounts = useAccountsStore((s) => s.accounts);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const currentTab = segments[segments.length - 1];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const settingsTranslateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const settingsOpenRef = useRef(false);
  const closeSettingsRef = useRef<() => void>(() => {});
  settingsOpenRef.current = settingsOpen;

  const openSettings = () => {
    setSettingsOpen(true);
    settingsTranslateX.setValue(SCREEN_WIDTH);
    Animated.spring(settingsTranslateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14, overshootClamping: true, restSpeedThreshold: 100, restDisplacementThreshold: 40 }).start();
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

  const [fabExpanded, setFabExpanded] = useState(false);
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabBackdropOpacity = useRef(new Animated.Value(0)).current;
  const item1Translate = useRef(new Animated.Value(0)).current;
  const item1Opacity = useRef(new Animated.Value(0)).current;
  const item2Translate = useRef(new Animated.Value(0)).current;
  const item2Opacity = useRef(new Animated.Value(0)).current;

  const expandFab = useCallback(() => {
    setFabExpanded(true);
    Animated.parallel([
      Animated.spring(fabRotation, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }),
      Animated.timing(fabBackdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(item1Translate, { toValue: 1, useNativeDriver: true, tension: 120, friction: 12 }),
      Animated.timing(item1Opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(item2Translate, { toValue: 1, useNativeDriver: true, tension: 100, friction: 12, delay: 40 }),
      Animated.timing(item2Opacity, { toValue: 1, duration: 150, delay: 40, useNativeDriver: true }),
    ]).start();
  }, [fabRotation, fabBackdropOpacity, item1Translate, item1Opacity, item2Translate, item2Opacity]);

  const collapseFab = useCallback(() => {
    Animated.parallel([
      Animated.spring(fabRotation, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }),
      Animated.timing(fabBackdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(item1Translate, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(item1Opacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(item2Translate, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(item2Opacity, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => setFabExpanded(false));
  }, [fabRotation, fabBackdropOpacity, item1Translate, item1Opacity, item2Translate, item2Opacity]);

  const fabBottom = TAB_BAR_HEIGHT + insets.bottom + 12;

  const currentTitle = TABS.find((t) => t.name === currentTab)?.title ?? "It's a My Money!";
  const showAccountFilter = currentTab !== 'accounts';
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <Text style={[currentTitle === "It's a My Money!" ? styles.headerTitleLogo : styles.headerTitle, { color: textColor }]}>{currentTitle}</Text>
        <View style={styles.headerActions}>
          {showAccountFilter && (
            <TouchableOpacity
              style={styles.accountBtn}
              onPress={() => setAccountDropdownOpen((v) => !v)}
              hitSlop={8}
              activeOpacity={0.7}
            >
              {selectedAccount ? (
                <View style={[styles.accountBtnIcon, { backgroundColor: selectedAccount.color ?? '#55A3FF' }]}>
                  <AccountIcon name={selectedAccount.icon ?? 'account-balance-wallet'} size={11} color="#fff" />
                </View>
              ) : (
                <MaterialIcons name="layers" size={20} color={textColor} />
              )}
              <MaterialIcons name="expand-more" size={16} color={textColor} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={openSettings} hitSlop={8}>
            <MaterialIcons name="settings" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account dropdown */}
      {accountDropdownOpen && (
        <>
          <Pressable style={[StyleSheet.absoluteFill, { zIndex: 40, top: insets.top + HEADER_HEIGHT }]} onPress={() => setAccountDropdownOpen(false)} />
          <View style={[styles.accountDropdown, { backgroundColor: bg, borderColor, zIndex: 50, top: insets.top + HEADER_HEIGHT }]}>
            <TouchableOpacity
              style={[styles.accountDropdownItem, { borderBottomColor: borderColor }]}
              onPress={() => { setSelectedAccountId(null); setAccountDropdownOpen(false); }}
            >
              <MaterialIcons name="layers" size={18} color={accentColor} />
              <Text style={[styles.accountDropdownText, { color: selectedAccountId === null ? accentColor : textColor }]}>All Accounts</Text>
              {selectedAccountId === null && <MaterialIcons name="check" size={18} color={accentColor} />}
            </TouchableOpacity>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accountDropdownItem, { borderBottomColor: borderColor }]}
                onPress={() => { setSelectedAccountId(acc.id); setAccountDropdownOpen(false); }}
              >
                <View style={[styles.accountBtnIcon, { backgroundColor: acc.color ?? '#55A3FF' }]}>
                  <AccountIcon name={acc.icon ?? 'account-balance-wallet'} size={13} color="#fff" />
                </View>
                <Text style={[styles.accountDropdownText, { color: selectedAccountId === acc.id ? accentColor : textColor }]} numberOfLines={1}>
                  {acc.name}
                </Text>
                {selectedAccountId === acc.id && <MaterialIcons name="check" size={18} color={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
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
      <View style={[styles.tabBar, { backgroundColor: bg, borderTopColor: borderColor, height: TAB_BAR_HEIGHT + insets.bottom }]}>
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
      </View>

      {fabExpanded && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.fabBackdrop, { opacity: fabBackdropOpacity }]} pointerEvents="box-none">
          <Pressable style={{ flex: 1 }} onPress={collapseFab} />
        </Animated.View>
      )}
      {(
        <>
          {/* Speed-dial item 2: Transfer (top) */}
          <Animated.View
            style={[
              styles.fabSpeedItem,
              { bottom: fabBottom + 132 },
              {
                opacity: item2Opacity,
                transform: [{ translateY: item2Translate.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}
            pointerEvents={fabExpanded ? 'auto' : 'none'}
          >
            <Text style={[styles.fabSpeedLabel, { backgroundColor: bg, color: textColor, borderColor, opacity: accounts.length < 2 ? 0.4 : 1 }]}>Transfer</Text>
            <TouchableOpacity
              style={[styles.fabSpeedBtn, { backgroundColor: bg, borderColor, opacity: accounts.length < 2 ? 0.4 : 1 }]}
              onPress={() => { collapseFab(); openTransfer(); }}
              activeOpacity={0.8}
              disabled={accounts.length < 2}
            >
              <MaterialIcons name="swap-horiz" size={22} color={accentColor} />
            </TouchableOpacity>
          </Animated.View>

          {/* Speed-dial item 1: Transaction */}
          <Animated.View
            style={[
              styles.fabSpeedItem,
              { bottom: fabBottom + 72 },
              {
                opacity: item1Opacity,
                transform: [{ translateY: item1Translate.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}
            pointerEvents={fabExpanded ? 'auto' : 'none'}
          >
            <Text style={[styles.fabSpeedLabel, { backgroundColor: bg, color: textColor, borderColor }]}>Transaction</Text>
            <TouchableOpacity
              style={[styles.fabSpeedBtn, { backgroundColor: bg, borderColor }]}
              onPress={() => { collapseFab(); openAddTx(); }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={22} color={accentColor} />
            </TouchableOpacity>
          </Animated.View>

          {/* Main FAB */}
          <TouchableOpacity
            style={[styles.fab, { bottom: fabBottom, backgroundColor: accentColor }]}
            onPress={fabExpanded ? collapseFab : expandFab}
            activeOpacity={0.85}
          >
            <Animated.View style={{ transform: [{ rotate: fabRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
              <MaterialIcons name="add" size={28} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
        </>
      )}
      <AddTransactionSheet isOpen={isAddTxOpen} onClose={closeAddTx} />
      <TransferSheet isOpen={isTransferOpen} onClose={closeTransfer} />

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
    flex: 1,
  },
  headerTitleLogo: {
    fontFamily: 'LilitaOne',
    fontSize: 20,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  accountBtnIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountDropdown: {
    position: 'absolute',
    right: 8,
    minWidth: 200,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  accountDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accountDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
    zIndex: 200,
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
  fabBackdrop: {
    zIndex: 98,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fabSpeedItem: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99,
  },
  fabSpeedLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabSpeedBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
