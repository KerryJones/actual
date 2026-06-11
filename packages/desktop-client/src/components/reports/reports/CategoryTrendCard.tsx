// FINANCE FORK: 3×3 small-multiples of 12-month category sparklines.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryTrendWidget } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { categoryName } from '#components/reports/CategoryComparisonList';
import { CompactAreaChart } from '#components/reports/charts/CompactAreaChart';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getCategoryTrendData,
  type CategoryTrendData,
  type CategoryTrendSeries,
} from '#components/reports/spreadsheets/category-trend-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategoriesById } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';

type CategoryTrendCardProps = {
  isEditing?: boolean;
  meta?: CategoryTrendWidget['meta'];
  onMetaChange: (newMeta: CategoryTrendWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function CategoryTrendCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: CategoryTrendCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);
  const { data: categoryMaps } = useCategoriesById();

  const data = useReport<CategoryTrendData>(
    'category-trend',
    getCategoryTrendData,
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
            name={meta?.name || t('Spending by Category')}
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
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 20,
          }}
        >
          {!data || !categoryMaps ? (
            <LoadingIndicator />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gridAutoRows: '1fr',
                gap: 8,
                flex: 1,
                minHeight: 0,
                height: '100%',
              }}
            >
              {data.series.map(series => (
                <TrendCell
                  key={series.category}
                  series={series}
                  categoryName={categoryName(categoryMaps, series.category, t)}
                />
              ))}
            </div>
          )}
        </View>
      </View>
    </ReportCard>
  );
}

function TrendCell({
  series,
  categoryName,
}: {
  series: CategoryTrendSeries;
  categoryName: string;
}) {
  const format = useFormat();
  const points = series.values.map((y, i) => ({ x: i, y }));

  return (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        borderRadius: 4,
        padding: 6,
        gap: 2,
        minHeight: 80,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 4,
        }}
      >
        <span
          style={{
            color: theme.pageTextLight,
            fontSize: 11,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {categoryName}
        </span>
        <span
          style={{
            color: theme.pageTextSubdued,
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          <PrivacyFilter>
            {format(series.baseline, 'financial-no-decimals')}
          </PrivacyFilter>
        </span>
      </View>
      <CompactAreaChart
        data={points}
        referenceY={series.baseline}
        color={theme.reportsBlue}
        height={50}
      />
    </View>
  );
}
