// FINANCE FORK: Savings Rate hero card with trailing-12-month sparkline.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SavingsRateWidget } from '@actual-app/core/types/models';

import { CompactAreaChart } from '#components/reports/charts/CompactAreaChart';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getSavingsRateData,
  type SavingsRateData,
} from '#components/reports/spreadsheets/savings-rate-spreadsheet';
import { SummaryNumber } from '#components/reports/SummaryNumber';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';

type SavingsRateCardProps = {
  isEditing?: boolean;
  meta?: SavingsRateWidget['meta'];
  onMetaChange: (newMeta: SavingsRateWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function SavingsRateCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: SavingsRateCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const data = useReport<SavingsRateData>('savings-rate', getSavingsRateData);

  const sparklineData = data
    ? data.months.map(m => ({ x: m.month, y: m.rate * 100 }))
    : [];
  const positive = (data?.trailingRate ?? 0) >= 0;
  const sparklineColor = positive
    ? theme.reportsNumberPositive
    : theme.reportsNumberNegative;

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
            name={meta?.name || t('Savings Rate')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {data ? <DateRange start={data.start} end={data.end} /> : null}
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 60,
          }}
        >
          {data ? (
            <SummaryNumber
              value={data.trailingRate * 100}
              contentType="percentage"
              suffix="%"
              loading={false}
            />
          ) : (
            <LoadingIndicator />
          )}
        </View>
        {data && data.months.length > 1 && (
          <View
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
            }}
          >
            <CompactAreaChart
              data={sparklineData}
              color={sparklineColor}
              referenceY={0}
              height={80}
            />
          </View>
        )}
      </View>
    </ReportCard>
  );
}
