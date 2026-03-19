import { StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getColors } from '@/constants/theme';

export type PeriodMode = 'day' | 'month' | 'year';

/** Returns the YYYY-MM-DD inclusive bounds for a given mode + date. */
export function getDateRange(mode: PeriodMode, date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (mode === 'day') {
    const str = `${y}-${m}-${d}`;
    return { start: str, end: str };
  }
  if (mode === 'month') {
    const lastDay = new Date(y, date.getMonth() + 1, 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
  }
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export function periodNavLabel(mode: PeriodMode, date: Date): string {
  if (mode === 'day')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (mode === 'month')
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return String(date.getFullYear());
}

/** Short contextual label for use inside summary cards ("this month", "today", "2025", …). */
export function shortPeriodLabel(mode: PeriodMode, date: Date): string {
  const now = new Date();
  if (mode === 'day') {
    if (date.toDateString() === now.toDateString()) return 'today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (mode === 'month') {
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth())
      return 'this month';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (date.getFullYear() === now.getFullYear()) return 'this year';
  return String(date.getFullYear());
}

export function navigatePeriod(mode: PeriodMode, date: Date, dir: 1 | -1): Date {
  const d = new Date(date);
  if (mode === 'day') d.setDate(d.getDate() + dir);
  else if (mode === 'month') d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

const MODES: PeriodMode[] = ['day', 'month', 'year'];

interface Props {
  mode: PeriodMode;
  date: Date;
  onChange: (mode: PeriodMode, date: Date) => void;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function PeriodSelector({ mode, date, onChange }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);

  const { textColor, subColor, inputBg: tabBg, borderColor } = getColors(isDark);

  const showToday = !isToday(date);

  return (
    <View style={[styles.container, { borderTopColor: borderColor }]}>
      {/* Prev / label / next */}
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={() => onChange(mode, navigatePeriod(mode, date, -1))}
          hitSlop={10}
        >
          <MaterialIcons name="chevron-left" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.label, { color: textColor }]}>{periodNavLabel(mode, date)}</Text>
        <TouchableOpacity
          onPress={() => onChange(mode, navigatePeriod(mode, date, 1))}
          hitSlop={10}
        >
          <MaterialIcons name="chevron-right" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        {/* Today button — always rendered to avoid layout shift */}
        <TouchableOpacity
          style={[styles.todayBtn, { borderColor, opacity: showToday ? 1 : 0 }]}
          onPress={() => onChange(mode, new Date())}
          hitSlop={6}
          disabled={!showToday}
        >
          <Text style={[styles.todayText, { color: accentColor }]}>Today</Text>
        </TouchableOpacity>

        {/* Mode tabs */}
        <View style={[styles.tabs, { backgroundColor: tabBg }]}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.tab, mode === m && { backgroundColor: accentColor }]}
              onPress={() => onChange(m, date)}
            >
              <Text style={[styles.tabText, { color: mode === m ? '#fff' : subColor }]}>
                {m === 'day' ? 'Day' : m === 'month' ? 'Month' : 'Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabActive: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
