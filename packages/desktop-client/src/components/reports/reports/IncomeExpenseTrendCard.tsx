// FINANCE FORK: 12-month paired income/expense bars (income up, expense down).
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { IncomeExpenseTrendWidget } from '@actual-app/core/types/models';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getIncomeExpenseTrendData,
  type IncomeExpenseTrendData,
} from '#components/reports/spreadsheets/income-expense-trend-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type IncomeExpenseTrendCardProps = {
  isEditing?: boolean;
  meta?: IncomeExpenseTrendWidget['meta'];
  onMetaChange: (newMeta: IncomeExpenseTrendWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function IncomeExpenseTrendCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: IncomeExpenseTrendCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const data = useReport<IncomeExpenseTrendData>(
    'income-expense-trend',
    getIncomeExpenseTrendData,
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.months.map(m => ({
      label: monthUtils.format(m.month, "MMM ''yy", locale),
      income: m.income,
      expense: -m.expense,
    }));
  }, [data, locale]);

  // Recharts auto-scales the Y domain from the data; if every month is zero
  // (brand-new account, sync hasn't run, all months pre-budget) the axis
  // collapses to [0,0] and the chart renders as a flat zero line. Render a
  // friendly empty state instead.
  const hasAnyFlow =
    data?.months.some(m => m.income !== 0 || m.expense !== 0) ?? false;

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
            name={meta?.name || t('Income vs Expense')}
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
          ) : !hasAnyFlow ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: 12,
              }}
            >
              <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
                {t('No income or expense activity in the last 12 months.')}
              </Block>
            </View>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
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
                    format(Math.abs(v as number), 'financial-no-decimals')
                  }
                />
                <ReferenceLine y={0} stroke={theme.tableBorder} />
                <Tooltip
                  cursor={{ fill: theme.tableBorder, opacity: 0.2 }}
                  contentStyle={{
                    backgroundColor: theme.menuBackground,
                    borderColor: theme.tableBorder,
                    color: theme.menuItemText,
                    fontSize: 12,
                  }}
                  // Expense bars are stored negated so they draw below the
                   // axis; the tooltip shows positive amounts on both rows
                   // and relies on the row label (Income vs Expense) plus
                   // the colored dot to communicate direction.
                  formatter={(value, name) => [
                    format(Math.abs(Number(value)), 'financial'),
                    String(name),
                  ]}
                />
                <Bar
                  dataKey="income"
                  name={t('Income')}
                  fill={theme.reportsNumberPositive}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="expense"
                  name={t('Expense')}
                  fill={theme.reportsNumberNegative}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </View>
      </View>
    </ReportCard>
  );
}
