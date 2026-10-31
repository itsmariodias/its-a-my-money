import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { useRecurringStore } from '@/features/recurring/useRecurringStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { todayString } from '@/shared/dates';
import { formatAmount, formatCompact } from '@/constants/currencies';
import { formatDate } from '@/constants/dateFormats';
import type { Account } from '@/types';
import { balanceForecast, niceAxis, shortDayLabel } from './forecastUtils';

interface Props {
  /** Cash accounts in the dashboard's scope — all one currency. Not empty. */
  accounts: Account[];
  currency: string;
  /** Width the chart has to fill, Y axis included. */
  width: number;
}

const CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 40;

export default function CashForecastChart({ accounts, currency, width }: Props) {
  const transactions = useTransactionsStore((s) => s.transactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const recurring = useRecurringStore((s) => s.recurringTransactions);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const { textColor, subColor, borderColor, accentColor } = useAppTheme();
  const today = todayString();

  const forecast = useMemo(
    () => balanceForecast({ accounts, transactions, transfers, recurring, today }),
    [accounts, transactions, transfers, recurring, today],
  );

  // The axis starts at a round value near the lowest point rather than at zero, so a small change
  // on a large balance is still visible. Points are plotted above the axis start (which also keeps
  // negative balances out of gifted-charts' below-axis mode) and the labels carry the real values,
  // so the bottom of the chart never reads as zero unless it is.
  const { chartData, todayIdx, axis, yLabels } = useMemo(() => {
    const values = forecast.points.map((p) => p.value);
    const a = niceAxis(Math.min(...values), Math.max(...values));
    const idx = forecast.points.findIndex((p) => p.projected) - 1;
    return {
      axis: a,
      yLabels: Array.from({ length: a.sections + 1 }, (_, i) => formatCompact(a.min + i * a.step)),
      todayIdx: idx,
      chartData: forecast.points.map((p, i) => ({
        value: p.value - a.min,
        hideDataPoint: i !== idx,
        showVerticalLine: i === idx,
        verticalLineColor: subColor,
        verticalLineThickness: 1,
      })),
    };
  }, [forecast, subColor]);

  const points = forecast.points;
  const todayValue = points[todayIdx].value;
  const change = forecast.endValue - todayValue;
  const chartWidth = width - Y_AXIS_WIDTH;
  const changeColor = change >= 0 ? '#4CAF50' : '#F44336';

  return (
    <View>
      <Text style={[styles.title, { color: textColor }]}>Cash Forecast</Text>

      <Text style={[styles.caption, { color: subColor }]}>
        Projected by {formatDate(points[points.length - 1].date, dateFormat)}
      </Text>
      <View style={styles.headlineRow}>
        <Text style={[styles.headline, { color: textColor }]}>
          {formatAmount(forecast.endValue, currency, undefined, numberFormat)}
        </Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {change >= 0 ? '▲' : '▼'} {formatAmount(Math.abs(change), currency, undefined, numberFormat)} vs today
        </Text>
      </View>

      <View style={styles.chart}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={CHART_HEIGHT}
          adjustToWidth
          initialSpacing={0}
          endSpacing={0}
          color={accentColor}
          thickness={2}
          curved
          areaChart
          startFillColor={accentColor}
          endFillColor={accentColor}
          startOpacity={0.25}
          endOpacity={0.02}
          lineSegments={[{ startIndex: todayIdx, endIndex: chartData.length - 1, strokeDashArray: [6, 4] }]}
          dataPointsColor={accentColor}
          dataPointsRadius={4}
          maxValue={axis.max - axis.min}
          noOfSections={axis.sections}
          yAxisLabelTexts={yLabels}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisTextStyle={{ color: subColor, fontSize: 10 }}
          yAxisThickness={0}
          rulesColor={borderColor}
          rulesType="dashed"
          dashWidth={4}
          dashGap={4}
          xAxisThickness={1}
          xAxisColor={borderColor}
          disableScroll
          isAnimated
        />
      </View>

      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: subColor }]}>{shortDayLabel(points[0].date)}</Text>
        <Text style={[styles.axisLabel, { color: textColor }]}>
          Today · {formatAmount(todayValue, currency, undefined, numberFormat)}
        </Text>
        <Text style={[styles.axisLabel, { color: subColor }]}>{shortDayLabel(points[points.length - 1].date)}</Text>
      </View>

      <Text style={[styles.footnote, { color: subColor }]}>
        {forecast.trendPerDay === null
          ? 'Based on your recurring items only — not enough history yet for a spending trend.'
          : 'Based on your recurring items plus your average over the last 90 days.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  caption: { fontSize: 12 },
  headlineRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  headline: { fontSize: 22, fontWeight: '700' },
  change: { fontSize: 12, fontWeight: '600' },
  chart: { marginTop: 12 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: Y_AXIS_WIDTH },
  axisLabel: { fontSize: 11 },
  footnote: { fontSize: 11, marginTop: 10 },
});
