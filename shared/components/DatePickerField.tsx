import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Calendar } from 'react-native-calendars';
import { getYear } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import { formatDate } from '@/constants/dateFormats';
import { firstDayOfMonth, monthKeyOf, withYear, yearOfMonth } from '@/shared/dates';
import { useSettingsStore } from '@/features/settings/useSettingsStore';

const YEARS = Array.from({ length: getYear(new Date()) - 1977 + 11 }, (_, i) => 1977 + i);

interface Props {
  date: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export default function DatePickerField({ date, onChange, minDate }: Props) {
  const { accentColor, onAccentColor, cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = useAppTheme();
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = { ...sheetStyles, ...localStyles };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(() => monthKeyOf(date)); // YYYY-MM
  const [showYearPicker, setShowYearPicker] = useState(false);
  const yearScrollRef = useRef<ScrollView>(null);
  const calendarYear = yearOfMonth(calendarMonth);

  useEffect(() => {
    if (!showYearPicker) return;
    const row = Math.floor((calendarYear - 1977) / 4);
    const y = Math.max(0, row * 44 - 110);
    const t = setTimeout(() => yearScrollRef.current?.scrollTo({ y, animated: false }), 50);
    return () => clearTimeout(t);
  }, [showYearPicker, calendarYear]);

  return (
    <>
      <TouchableOpacity
        style={[styles.dateRow, { backgroundColor: inputBg, borderColor }]}
        onPress={() => { setCalendarMonth(monthKeyOf(date)); setShowYearPicker(false); setShowDatePicker(true); }}
        activeOpacity={0.7}
      >
        <MaterialIcons name="calendar-today" size={18} color={subTextColor} />
        <Text style={[styles.dateText, { color: textColor }]}>{formatDate(date, dateFormat)}</Text>
        <MaterialIcons name="expand-more" size={20} color={subTextColor} />
      </TouchableOpacity>

      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.datePickerModal}>
          <Pressable style={styles.datePickerBackdrop} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.datePickerDialog, { backgroundColor: bg }]}>
            {showYearPicker ? (
              <>
                <View style={[styles.datePickerYearHeader, { borderBottomColor: borderColor }]}>
                  <TouchableOpacity onPress={() => setShowYearPicker(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="chevron-left" size={20} color={accentColor} />
                    <Text style={{ color: accentColor, fontWeight: '600', fontSize: 15 }}>Back</Text>
                  </TouchableOpacity>
                  <Text style={{ color: textColor, fontWeight: '700', fontSize: 15 }}>{calendarYear}</Text>
                </View>
                <ScrollView ref={yearScrollRef} style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.datePickerYearGrid}>
                    {YEARS.map((year) => {
                      const isSelected = year === calendarYear;
                      return (
                        <TouchableOpacity
                          key={year}
                          style={[styles.datePickerYearItem, isSelected && { backgroundColor: accentColor }]}
                          onPress={() => {
                            setCalendarMonth(withYear(calendarMonth, year));
                            setCalendarKey((k) => k + 1);
                            setShowYearPicker(false);
                          }}
                        >
                          <Text style={{ color: isSelected ? onAccentColor : textColor, fontWeight: isSelected ? '700' : '400', fontSize: 14 }}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            ) : (
              <>
                <View style={[styles.datePickerYearChip, { borderBottomColor: borderColor }]}>
                  <TouchableOpacity
                    style={[styles.datePickerYearChipBtn, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}
                    onPress={() => setShowYearPicker(true)}
                  >
                    <Text style={{ color: accentColor, fontWeight: '700', fontSize: 14 }}>{calendarYear}</Text>
                    <MaterialIcons name="arrow-drop-down" size={18} color={accentColor} />
                  </TouchableOpacity>
                </View>
                <Calendar
                  key={calendarKey}
                  current={firstDayOfMonth(calendarMonth)}
                  minDate={minDate}
                  markedDates={{ [date]: { selected: true, selectedColor: accentColor } }}
                  onDayPress={(day) => { onChange(day.dateString); setShowDatePicker(false); }}
                  onMonthChange={(month) => setCalendarMonth(monthKeyOf(month.dateString))}
                  theme={{
                    calendarBackground: bg,
                    textSectionTitleColor: subTextColor,
                    selectedDayBackgroundColor: accentColor,
                    selectedDayTextColor: onAccentColor,
                    todayTextColor: accentColor,
                    dayTextColor: textColor,
                    textDisabledColor: subTextColor,
                    arrowColor: accentColor,
                    monthTextColor: textColor,
                    textDayFontWeight: '400',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '600',
                  }}
                />
              </>
            )}
            <TouchableOpacity
              style={[styles.datePickerFooter, { borderTopColor: borderColor }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{ color: subTextColor, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles = StyleSheet.create({});
