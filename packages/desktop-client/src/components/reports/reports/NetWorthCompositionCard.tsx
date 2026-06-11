// FINANCE FORK: Stacked area chart of net worth by [L|I|R|D]-prefixed account bucket.
import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  NetWorthCompositionWidget,
} from '@actual-app/core/types/models';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getColorScale } from '#components/reports/chart-theme';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  createNetWorthCompositionSpreadsheet,
  type CompositionBucket,
  type NetWorthCompositionData,
} from '#components/reports/spreadsheets/net-worth-composition-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';

type NetWorthCompositionCardProps = {
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: NetWorthCompositionWidget['meta'];
  onMetaChange: (newMeta: NetWorthCompositionWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function NetWorthCompositionCard({
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: NetWorthCompositionCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const getData = useMemo(
    () => createNetWorthCompositionSpreadsheet(accounts),
    [accounts],
  );
  const data = useReport<NetWorthCompositionData>(
    'net-worth-composition',
    getData,
  );

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
            name={meta?.name || t('Net Worth Composition')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {data ? <DateRange start={data.start} end={data.end} /> : null}
        </View>
        <View style={{ flex: 1, paddingBottom: 12 }}>
          {data ? <CompositionChart data={data} /> : <LoadingIndicator />}
        </View>
      </View>
    </ReportCard>
  );
}

function CompositionChart({ data }: { data: NetWorthCompositionData }) {
  const { t } = useTranslation();
  const format = useFormat();
  const baseId = useId();
  const palette = getColorScale('qualitative');

  const buckets: Array<{
    key: CompositionBucket;
    label: string;
    color: string;
    gradId: string;
  }> = [
    { key: 'liquid', label: t('Liquid'), color: palette[0], gradId: `${baseId}-liquid` },
    {
      key: 'investments',
      label: t('Investments'),
      color: palette[1],
      gradId: `${baseId}-investments`,
    },
    {
      key: 'realEstate',
      label: t('Real Estate'),
      color: palette[2],
      gradId: `${baseId}-realestate`,
    },
    { key: 'debt', label: t('Debt'), color: palette[3], gradId: `${baseId}-debt` },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data.months}
        margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
      >
        <defs>
          {buckets.map(({ gradId, color }) => (
            <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fill: theme.pageTextLight, fontSize: 11 }}
          tickLine={{ stroke: theme.tableBorder }}
        />
        <YAxis
          tick={{ fill: theme.pageTextLight, fontSize: 11 }}
          tickLine={{ stroke: theme.tableBorder }}
          tickFormatter={v => format(v, 'financial-no-decimals')}
          width={64}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.menuBackground,
            border: `1px solid ${theme.tableBorder}`,
            color: theme.menuItemText,
          }}
          formatter={value =>
            typeof value === 'number' ? format(value, 'financial') : String(value)
          }
        />
        {buckets.map(({ key, label, color, gradId }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stackId="composition"
            stroke={color}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
