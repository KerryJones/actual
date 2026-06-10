import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';
import { integerToAmount } from '@actual-app/core/shared/util';

import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getYTDFlowData,
  type YTDFlowData,
} from '#components/reports/spreadsheets/ytd-flow-spreadsheet';
import { SummaryNumber } from '#components/reports/SummaryNumber';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';

type YTDFlowKind = 'income' | 'expense';
type YTDFlowMeta = { name?: string } | null;

type YTDFlowCardProps = {
  kind: YTDFlowKind;
  defaultName: string;
  isEditing?: boolean;
  meta?: YTDFlowMeta;
  onMetaChange: (newMeta: YTDFlowMeta) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function YTDFlowCard({
  kind,
  defaultName,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: YTDFlowCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const data = useReport<YTDFlowData>('ytd-flow', getYTDFlowData);

  // SummaryNumber colors by sign: income stays positive (green),
  // expense is flipped negative (red) — the spreadsheet returns both as
  // positive cents.
  const signedAmount = data
    ? integerToAmount(kind === 'income' ? data.income : -data.expense)
    : 0;

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
            name={meta?.name || defaultName}
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
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
          }}
        >
          {data ? (
            <SummaryNumber
              value={signedAmount}
              contentType="sum"
              loading={false}
            />
          ) : (
            <LoadingIndicator />
          )}
        </View>
      </View>
    </ReportCard>
  );
}
