// FINANCE FORK: per-category current-month delta vs trailing-3-month average.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TopMoversWidget } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import {
  categoryName,
  type CategoriesById,
} from '#components/reports/CategoryComparisonList';
import { ProgressBar } from '#components/reports/charts/ProgressBar';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getTopMoversData,
  type TopMoverRow,
  type TopMoversData,
} from '#components/reports/spreadsheets/top-movers-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategoriesById } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type TopMoversCardProps = {
  isEditing?: boolean;
  meta?: TopMoversWidget['meta'];
  onMetaChange: (newMeta: TopMoversWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function TopMoversCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: TopMoversCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);
  const { data: categoryMaps } = useCategoriesById();

  const data = useReport<TopMoversData>('top-movers', getTopMoversData);

  const monthLabel = data
    ? monthUtils.format(data.currentMonth, 'MMM yyyy', locale)
    : '';

  const maxDelta = data
    ? Math.max(
        1,
        ...data.upMovers.map(r => Math.abs(r.delta)),
        ...data.downMovers.map(r => Math.abs(r.delta)),
      )
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
            name={meta?.name || t('Top Movers')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {data ? (
            <Block style={{ color: theme.pageTextSubdued }}>
              {t('{{month}} vs trailing 3-mo avg', { month: monthLabel })}
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
          ) : (
            <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
              <MoverColumn
                title={t('Spending up')}
                rows={data.upMovers}
                maxDelta={maxDelta}
                accent={theme.reportsNumberNegative}
                sign="+"
                categoryMaps={categoryMaps}
              />
              <MoverColumn
                title={t('Spending down')}
                rows={data.downMovers}
                maxDelta={maxDelta}
                accent={theme.reportsNumberPositive}
                sign="−"
                categoryMaps={categoryMaps}
              />
            </View>
          )}
        </View>
      </View>
    </ReportCard>
  );
}

type MoverColumnProps = {
  title: string;
  rows: TopMoverRow[];
  maxDelta: number;
  accent: string;
  sign: '+' | '−';
  categoryMaps: CategoriesById;
};

function MoverColumn({
  title,
  rows,
  maxDelta,
  accent,
  sign,
  categoryMaps,
}: MoverColumnProps) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Block
        style={{
          color: theme.pageTextLight,
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 2,
        }}
      >
        {title}
      </Block>
      {rows.length === 0 ? (
        <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
          {t('No movement')}
        </Block>
      ) : (
        rows.map(row => (
          <View key={row.category} style={{ gap: 2 }}>
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
                  {sign + format(Math.abs(row.delta), 'financial')}
                </PrivacyFilter>
              </span>
            </View>
            <ProgressBar
              percent={(Math.abs(row.delta) / maxDelta) * 100}
              color={accent}
              height={6}
            />
          </View>
        ))
      )}
    </View>
  );
}
