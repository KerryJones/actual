import React from 'react';
import { useTranslation } from 'react-i18next';

import { integerToAmount } from '@actual-app/core/shared/util';

import { DateRange } from '#components/reports/DateRange';
import { DashboardCard } from '#components/reports/dashboard/DashboardCard';
import { KPI } from '#components/reports/dashboard/KPI';
import {
  getYTDFlowData,
  type YTDFlowData,
} from '#components/reports/spreadsheets/ytd-flow-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';

type YTDFlowKind = 'income' | 'expense';

type YTDFlowCardProps = {
  kind: YTDFlowKind;
  defaultName: string;
  isEditing?: boolean;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function YTDFlowCard({
  kind,
  defaultName,
  isEditing,
  onRemove,
  onCopy,
}: YTDFlowCardProps) {
  const { t } = useTranslation();
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const data = useReport<YTDFlowData>('ytd-flow', getYTDFlowData);

  return (
    <DashboardCard
      isEditing={isEditing}
      menuItems={[
        { name: 'remove', text: t('Remove') },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        if (item === 'remove') onRemove();
      }}
    >
      <KPI
        label={defaultName}
        value={
          data ? (
            <KPI.Currency
              amount={integerToAmount(
                kind === 'income' ? data.income : data.expense,
              )}
              tone={kind === 'expense' ? 'negative' : 'default'}
            />
          ) : (
            <span className="text-4xl text-slate-500 tabular-nums">—</span>
          )
        }
        hint={data ? <DateRange start={data.start} end={data.end} /> : null}
      />
    </DashboardCard>
  );
}
