// FINANCE FORK: 24-month net worth line chart with axis labels + gridlines.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { NetWorthTrendWidget } from '@actual-app/core/types/models';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  createNetWorthTrendSpreadsheet,
  type NetWorthTrendData,
  type NetWorthTrendPoint,
} from '#components/reports/spreadsheets/net-worth-trend-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type NetWorthTrendCardProps = {
  isEditing?: boolean;
  meta?: NetWorthTrendWidget['meta'];
  onMetaChange: (newMeta: NetWorthTrendWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

type TrendDatum = {
  month: string;
  label: string;
  current: number;
  priorYear: number | null;
};

export function NetWorthTrendCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: NetWorthTrendCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const getData = useMemo(() => createNetWorthTrendSpreadsheet(24), []);
  const data = useReport<NetWorthTrendData>('net-worth-trend', getData);

  // Only attach prior-year values when the spreadsheet confirms there's real
  // history across the full 24-month window — otherwise the early "running
  // total" months are just startingBalance=0 noise, and Recharts would draw
  // a flat $0 line stitched onto the front of the chart.
  const hasPriorYear = !!data?.hasFullHistory;
  // Brand-new accounts with zero net worth across the full window would
  // render as a flat $0 line at the axis. Show an empty state instead.
  const hasAnyMovement =
    data?.months.some(m => m.value !== 0) ?? false;
  const chartData: TrendDatum[] = useMemo(() => {
    if (!data) return [];
    const byMonth = new Map(data.months.map(p => [p.month, p.value]));
    return data.months.slice(-12).map((p: NetWorthTrendPoint) => ({
      month: p.month,
      label: monthUtils.format(p.month, "MMM ''yy", locale),
      current: p.value,
      priorYear: hasPriorYear
        ? (byMonth.get(monthUtils.subMonths(p.month, 12)) ?? null)
        : null,
    }));
  }, [data, locale, hasPriorYear]);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      menuItems={[
        { name: 'rename', text: t('Rename') },
        { name: 'remove', text: t('Remove') },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized menu selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ flexGrow: 0, flexShrink: 0, padding: 20 }}>
          <ReportCardName
            name={meta?.name || t('Net Worth Trend')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
        </View>
        <View
          style={{
            flex: 1,
            paddingLeft: 12,
            paddingRight: 20,
            paddingBottom: 12,
          }}
        >
          {!data ? (
            <LoadingIndicator />
          ) : !hasAnyMovement ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: 12,
              }}
            >
              <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
                {t('Not enough net worth data to show a trend yet.')}
              </Block>
            </View>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke={theme.tableBorder}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: theme.pageTextSubdued, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: theme.tableBorder }}
                />
                <YAxis
                  tick={{ fill: theme.pageTextSubdued, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={v =>
                    format(v as number, 'financial-no-decimals')
                  }
                />
                <Tooltip
                  cursor={{ stroke: theme.tableBorder }}
                  contentStyle={{
                    backgroundColor: theme.menuBackground,
                    borderColor: theme.tableBorder,
                    color: theme.menuItemText,
                    fontSize: 12,
                  }}
                  formatter={(value, name) =>
                    value == null
                      ? ['—', String(name)]
                      : [format(Number(value), 'financial'), String(name)]
                  }
                />
                {hasPriorYear && (
                  <Line
                    type="monotone"
                    dataKey="priorYear"
                    name={t('Prior year')}
                    stroke={theme.pageTextSubdued}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="current"
                  name={t('Net worth')}
                  stroke={theme.reportsBlue}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </View>
      </View>
    </ReportCard>
  );
}
