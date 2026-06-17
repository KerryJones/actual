// FINANCE FORK: top-6 MTD spending categories with $ + MoM delta.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TopCategoriesWidget } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { categoryName } from '#components/reports/CategoryComparisonList';
import { ProgressBar } from '#components/reports/charts/ProgressBar';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getTopCategoriesData,
  type TopCategoriesData,
} from '#components/reports/spreadsheets/top-categories-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategoriesById } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type TopCategoriesCardProps = {
  isEditing?: boolean;
  meta?: TopCategoriesWidget['meta'];
  onMetaChange: (newMeta: TopCategoriesWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function TopCategoriesCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: TopCategoriesCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);
  const { data: categoryMaps } = useCategoriesById();

  const data = useReport<TopCategoriesData>(
    'top-categories',
    getTopCategoriesData,
  );

  const maxCurrent = data
    ? Math.max(1, ...data.rows.map(r => r.current))
    : 1;

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
            name={meta?.name || t('Top Categories')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {data ? (
            <Block style={{ color: theme.pageTextSubdued }}>
              {t('{{month}} vs prior month', {
                month: monthUtils.format(data.currentMonth, 'MMM yyyy', locale),
              })}
            </Block>
          ) : null}
        </View>
        <View
          style={{
            flex: 1,
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 16,
          }}
        >
          {!data || !categoryMaps ? (
            <LoadingIndicator />
          ) : data.rows.length === 0 ? (
            <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
              {t('No spending this month yet.')}
            </Block>
          ) : (
            <View style={{ gap: 10, flex: 1 }}>
              {data.rows.map(row => {
                const deltaSign = Math.sign(row.deltaPct);
                // Spending UP is bad (red); spending DOWN is good (green);
                // exactly equal to prior month is neutral.
                const deltaColor =
                  deltaSign > 0
                    ? theme.reportsNumberNegative
                    : deltaSign < 0
                      ? theme.reportsNumberPositive
                      : theme.pageTextSubdued;
                const sign = deltaSign > 0 ? '+' : deltaSign < 0 ? '−' : '';
                const showDelta = row.previous > 0;
                return (
                  <View key={row.category} style={{ gap: 4 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 8,
                        fontSize: 13,
                        color: theme.tableText,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          paddingRight: 8,
                        }}
                      >
                        {categoryName(categoryMaps, row.category, t)}
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <PrivacyFilter>
                          {format(row.current, 'financial')}
                        </PrivacyFilter>
                      </span>
                    </View>
                    <ProgressBar
                      percent={(row.current / maxCurrent) * 100}
                      color={theme.reportsBlue}
                      height={6}
                    />
                    {showDelta ? (
                      <Block
                        style={{
                          color: deltaColor,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {`${sign}${format(Math.abs(row.deltaPct) * 100, 'number')}% ${t('vs prior month')}`}
                      </Block>
                    ) : (
                      <Block
                        style={{ color: theme.pageTextSubdued, fontSize: 11 }}
                      >
                        {t('new this month')}
                      </Block>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ReportCard>
  );
}
