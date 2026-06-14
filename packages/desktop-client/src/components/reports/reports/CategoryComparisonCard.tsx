// FINANCE FORK: shared dashboard card shell for per-category two-window
// expense comparisons. MonthOverMonthCard and YTDCategoryCard wrap this with
// their specific window calculation and default name.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { CategoryComparisonList } from '#components/reports/CategoryComparisonList';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { createMonthOverMonthSpreadsheet } from '#components/reports/spreadsheets/month-over-month-spreadsheet';
import type { MonthOverMonthData } from '#components/reports/spreadsheets/month-over-month-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategoriesById } from '#hooks/useCategories';

export type CategoryComparisonMeta = {
  name?: string;
} | null;

export type CategoryComparisonWindow = {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

type CategoryComparisonCardProps = {
  defaultName: string;
  window: CategoryComparisonWindow;
  isEditing?: boolean;
  meta?: CategoryComparisonMeta;
  onMetaChange: (newMeta: CategoryComparisonMeta) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function CategoryComparisonCard({
  defaultName,
  window,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: CategoryComparisonCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { data: categoryMaps } = useCategoriesById();

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const getGraphData = useMemo(
    () => createMonthOverMonthSpreadsheet(window),
    [window],
  );

  const data = useReport<MonthOverMonthData>('default', getGraphData);

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
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
        <ReportCardName
          name={meta?.name || defaultName}
          isEditing={nameMenuOpen}
          onChange={newName => {
            onMetaChange({ ...meta, name: newName });
            setNameMenuOpen(false);
          }}
          onClose={() => setNameMenuOpen(false)}
        />
        {!data || !categoryMaps ? (
          <LoadingIndicator />
        ) : (
          <CategoryComparisonList data={data} categoryMaps={categoryMaps} />
        )}
      </View>
    </ReportCard>
  );
}
