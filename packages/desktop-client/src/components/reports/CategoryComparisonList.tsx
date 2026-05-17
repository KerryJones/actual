// FINANCE FORK: per-category two-window comparison list. Shared between
// MonthOverMonthCard and YTDCategoryCard.
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { PrivacyFilter } from '#components/PrivacyFilter';
import type { MonthOverMonthData } from '#components/reports/spreadsheets/month-over-month-spreadsheet';
import { useFormat } from '#hooks/useFormat';

const MAX_ROWS = 8;

export type CategoriesById = {
  list: Record<string, { name: string } | undefined>;
  grouped: Record<string, { name: string } | undefined>;
};

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
  const maxAbs = Math.max(
    1,
    ...rows.flatMap(r => [Math.abs(r.currentTotal), Math.abs(r.previousTotal)]),
  );

  const nameFor = (id: string) =>
    id === '__uncategorized__'
      ? t('Uncategorized')
      : (categoryMaps.list[id]?.name ?? t('Unknown category'));

  if (rows.length === 0) {
    return (
      <View
        style={{ marginTop: 8, color: theme.pageTextSubdued, fontSize: 13 }}
      >
        <Trans>No expenses in either window.</Trans>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      {rows.map(row => {
        // delta < 0 means current is more negative → spent more this window
        const delta = row.currentTotal - row.previousTotal;
        const spentMore = delta < 0;
        return (
          <View key={row.category} style={{ gap: 2 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                fontSize: 13,
                color: theme.tableText,
              }}
            >
              <span>{nameFor(row.category)}</span>
              <span
                style={{
                  color: spentMore
                    ? theme.reportsNumberNegative
                    : theme.reportsNumberPositive,
                  fontWeight: 500,
                }}
              >
                <PrivacyFilter>
                  {(spentMore ? '+' : '−') +
                    format(Math.abs(delta), 'financial')}
                </PrivacyFilter>
              </span>
            </View>
            <ComparisonBar
              currentMagnitude={Math.abs(row.currentTotal)}
              previousMagnitude={Math.abs(row.previousTotal)}
              maxAbs={maxAbs}
              spentMore={spentMore}
            />
          </View>
        );
      })}
    </View>
  );
}

function ComparisonBar({
  currentMagnitude,
  previousMagnitude,
  maxAbs,
  spentMore,
}: {
  currentMagnitude: number;
  previousMagnitude: number;
  maxAbs: number;
  spentMore: boolean;
}) {
  const currentPct = (currentMagnitude / maxAbs) * 100;
  const previousPct = (previousMagnitude / maxAbs) * 100;
  return (
    <View style={{ gap: 2 }}>
      <View
        style={{
          height: 6,
          backgroundColor: theme.tableBorder,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${currentPct}%`,
            height: '100%',
            backgroundColor: spentMore
              ? theme.reportsNumberNegative
              : theme.reportsNumberPositive,
          }}
        />
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: theme.tableBorder,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${previousPct}%`,
            height: '100%',
            backgroundColor: theme.pageTextSubdued,
          }}
        />
      </View>
    </View>
  );
}
