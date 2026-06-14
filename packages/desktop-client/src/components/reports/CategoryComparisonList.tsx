// FINANCE FORK: per-category two-window comparison list. Shared between
// MonthOverMonthCard and YTDCategoryCard.
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { ProgressBar } from '#components/reports/charts/ProgressBar';
import type { MonthOverMonthData } from '#components/reports/spreadsheets/month-over-month-spreadsheet';
import { useFormat } from '#hooks/useFormat';

const MAX_ROWS = 5;

export type CategoriesById = {
  list: Record<string, { name: string } | undefined>;
  grouped: Record<string, { name: string } | undefined>;
};

export function categoryName(
  maps: CategoriesById,
  id: string,
  t: (key: string) => string,
): string {
  return maps.list[id]?.name ?? t('Unknown category');
}

export function CategoryComparisonList({
  data,
  categoryMaps,
}: {
  data: MonthOverMonthData;
  categoryMaps: CategoriesById;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const rows = data.rows.slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return (
      <View
        style={{ marginTop: 8, color: theme.pageTextSubdued, fontSize: 13 }}
      >
        <Trans>No expenses in either window.</Trans>
      </View>
    );
  }

  const maxDelta = Math.max(
    1,
    ...rows.map(r => Math.abs(r.currentTotal - r.previousTotal)),
  );

  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      {rows.map(row => {
        // delta < 0 means current is more negative → spent more this window
        const delta = row.currentTotal - row.previousTotal;
        const absDelta = Math.abs(delta);
        const spentMore = delta < 0;
        const accent = spentMore
          ? theme.reportsNumberNegative
          : theme.reportsNumberPositive;
        return (
          <View key={row.category} style={{ gap: 4, flexShrink: 0 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
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
              <span style={{ color: accent, fontWeight: 500 }}>
                <PrivacyFilter>
                  {(spentMore ? '+' : '−') + format(absDelta, 'financial')}
                </PrivacyFilter>
              </span>
            </View>
            <ProgressBar
              percent={(absDelta / maxDelta) * 100}
              color={accent}
              height={6}
            />
          </View>
        );
      })}
    </View>
  );
}
