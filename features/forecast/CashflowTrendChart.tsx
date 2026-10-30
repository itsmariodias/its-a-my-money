import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount, formatCompact } from '@/constants/currencies';
import { niceAxis } from './forecastUtils';
import type { CashflowTrend } from './useCashflowTrend';

interface Props {
  trend: CashflowTrend;
  currency: string;
  /** Width the chart has to fill, Y axis included. */
  width: number;
}

const INCOME_COLOR = '#4CAF50';
const EXPENSE_COLOR = '#F44336';
// Same grey as the transfer icon in the Dashboard's recent list.
const TRANSFER_COLOR = '#9E9E9E';
const CHART_HEIGHT = 140;
const Y_AXIS_WIDTH = 36;
const BAR_GAP = 2;
const Y_LABEL_HALF_HEIGHT = 6;

interface StackedBarProps {
  width: number;
  base: number;      // height of the coloured part — income or expense
  top: number;       // height of the grey part above it — transfers in or out
  baseColor: string;
  topColor: string;
}

/** A bar whose transfers sit as a grey cap on its income or expense. */
function StackedBar({ width, base, top, baseColor, topColor }: StackedBarProps) {
  return (
    <View style={[styles.bar, { width }]}>
      {top > 0 && <View style={{ height: top, backgroundColor: topColor }} />}
      <View style={{ height: base, backgroundColor: baseColor }} />
    </View>
  );
}

function monthName(month: string, style: 'short' | 'long'): string {
  const [y, m] = month.split('-').map(Number);
  const opts: Intl.DateTimeFormatOptions = style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' };
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', opts);
}

export default function CashflowTrendChart({ trend, currency, width }: Props) {
  const { rows, summary, currentMonth } = trend;
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const { textColor, subColor, borderColor } = useAppTheme();
  // Keyed by month so a selection from another period simply finds nothing.
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // The latest month that has started is the default detail row.
  const selected = rows.find((r) => r.month === selectedMonth) ?? null;
  const detail = selected ?? rows.filter((r) => r.month <= currentMonth).pop() ?? rows[0];
  const net = detail.income - detail.expense;
  // Only filled in for a single selected account — see monthlyCashflow.
  const hasTransfers = rows.some((r) => r.transferIn > 0 || r.transferOut > 0);

  // Each month is an equal flex column, so every month in the range always fits the width.
  const groupWidth = (width - Y_AXIS_WIDTH) / rows.length;
  const barWidth = Math.min(16, Math.max(4, Math.floor(groupWidth * 0.28)));
  const axis = niceAxis(0, Math.max(...rows.map((r) => Math.max(r.income + r.transferIn, r.expense + r.transferOut))), 3);
  const barHeight = (value: number) => (value / axis.max) * CHART_HEIGHT;
  const gridValues = Array.from({ length: axis.sections + 1 }, (_, i) => axis.min + i * axis.step);

  const toggle = (month: string) => setSelectedMonth((prev) => (prev === month ? null : month));
  const dim = (color: string, month: string) => (selected === null || selected.month === month ? color : color + '55');

  return (
    <View>
      <Text style={[styles.title, { color: textColor }]}>Income vs Expenses</Text>

      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { width: Y_AXIS_WIDTH, height: CHART_HEIGHT }]}>
          {gridValues.map((v) => (
            <Text key={v} style={[styles.yLabel, { color: subColor, bottom: barHeight(v) - Y_LABEL_HALF_HEIGHT }]}>
              {formatCompact(v)}
            </Text>
          ))}
        </View>
        <View style={[styles.plot, { height: CHART_HEIGHT }]}>
          {gridValues.map((v) => (
            <View
              key={v}
              style={[styles.gridLine, { bottom: barHeight(v), backgroundColor: borderColor }]}
            />
          ))}
          {rows.map((r) => (
            <Pressable
              key={r.month}
              style={styles.group}
              onPress={() => toggle(r.month)}
              accessibilityRole="button"
              accessibilityLabel={`${monthName(r.month, 'long')}: in ${formatAmount(r.income, currency, undefined, numberFormat)}, out ${formatAmount(r.expense, currency, undefined, numberFormat)}${hasTransfers ? `, transfers in ${formatAmount(r.transferIn, currency, undefined, numberFormat)}, transfers out ${formatAmount(r.transferOut, currency, undefined, numberFormat)}` : ''}`}
            >
              <StackedBar
                width={barWidth}
                base={barHeight(r.income)}
                top={barHeight(r.transferIn)}
                baseColor={dim(INCOME_COLOR, r.month)}
                topColor={dim(TRANSFER_COLOR, r.month)}
              />
              <StackedBar
                width={barWidth}
                base={barHeight(r.expense)}
                top={barHeight(r.transferOut)}
                baseColor={dim(EXPENSE_COLOR, r.month)}
                topColor={dim(TRANSFER_COLOR, r.month)}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.monthRow, { paddingLeft: Y_AXIS_WIDTH }]}>
        {rows.map((r) => (
          <Text
            key={r.month}
            style={[styles.monthLabel, { color: selected?.month === r.month ? textColor : subColor }]}
            numberOfLines={1}
          >
            {monthName(r.month, 'short')}
          </Text>
        ))}
      </View>
      {hasTransfers && (
        <View style={styles.key}>
          {[['Income', INCOME_COLOR], ['Expenses', EXPENSE_COLOR], ['Transfers', TRANSFER_COLOR]].map(([label, color]) => (
            <View key={label} style={styles.keyItem}>
              <View style={[styles.keySwatch, { backgroundColor: color }]} />
              <Text style={[styles.keyLabel, { color: subColor }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.detail, { borderTopColor: borderColor }]}>
        <Text style={[styles.detailMonth, { color: textColor }]}>{monthName(detail.month, 'long')}</Text>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: subColor }]}>In</Text>
          <Text style={[styles.detailValue, { color: INCOME_COLOR }]}>
            {formatAmount(detail.income, currency, undefined, numberFormat)}
          </Text>
          <Text style={[styles.detailLabel, { color: subColor }]}>Out</Text>
          <Text style={[styles.detailValue, { color: EXPENSE_COLOR }]}>
            {formatAmount(detail.expense, currency, undefined, numberFormat)}
          </Text>
          <Text style={[styles.detailLabel, { color: subColor }]}>Net</Text>
          <Text style={[styles.detailValue, { color: net >= 0 ? INCOME_COLOR : EXPENSE_COLOR }]}>
            {formatAmount(net, currency, undefined, numberFormat)}
          </Text>
        </View>
        {(detail.transferIn > 0 || detail.transferOut > 0) && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: subColor }]}>Transfers in</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>
              {formatAmount(detail.transferIn, currency, undefined, numberFormat)}
            </Text>
            <Text style={[styles.detailLabel, { color: subColor }]}>out</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>
              {formatAmount(detail.transferOut, currency, undefined, numberFormat)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: subColor }]}>Avg saved / month</Text>
          <Text style={[styles.summaryValue, { color: summary.avgNet >= 0 ? INCOME_COLOR : EXPENSE_COLOR }]}>
            {formatAmount(summary.avgNet, currency, undefined, numberFormat)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: subColor }]}>Savings rate</Text>
          <Text style={[styles.summaryValue, { color: textColor }]}>
            {summary.savingsRate === null ? '—' : `${Math.round(summary.savingsRate)}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  chartRow: { flexDirection: 'row', marginTop: Y_LABEL_HALF_HEIGHT },
  yAxis: { position: 'relative' },
  yLabel: { position: 'absolute', left: 0, fontSize: 10, lineHeight: Y_LABEL_HALF_HEIGHT * 2 },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  group: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: BAR_GAP },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden' },
  monthRow: { flexDirection: 'row', marginTop: 4 },
  monthLabel: { flex: 1, fontSize: 10, textAlign: 'center' },
  key: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  keySwatch: { width: 8, height: 8, borderRadius: 2 },
  keyLabel: { fontSize: 11 },

  detail: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  detailMonth: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6, rowGap: 2 },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 13, fontWeight: '600', marginRight: 8 },

  summaryRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
});
