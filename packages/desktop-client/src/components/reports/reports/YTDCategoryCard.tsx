// FINANCE FORK: Year-to-date per-category expense comparison card.
// Window = Jan 1 this year → today vs Jan 1 last year → same MM-DD last year.
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import {
  CategoryComparisonCard,
  type CategoryComparisonMeta,
} from './CategoryComparisonCard';

type YTDCategoryCardProps = {
  isEditing?: boolean;
  meta?: CategoryComparisonMeta;
  onMetaChange: (newMeta: CategoryComparisonMeta) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function YTDCategoryCard(props: YTDCategoryCardProps) {
  const { t } = useTranslation();

  const window = useMemo(() => {
    const today = monthUtils.currentDay();
    const year = today.slice(0, 4);
    const priorYear = String(parseInt(year, 10) - 1);
    // If today is Feb 29 and the prior year is not a leap year,
    // clamp to Feb 28 so the date string is always valid.
    const isLeapYear = (y: number) =>
      (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const priorYearInt = parseInt(priorYear, 10);
    const todayMMDD = today.slice(5); // MM-DD
    const priorEnd =
      todayMMDD === '02-29' && !isLeapYear(priorYearInt)
        ? `${priorYear}-02-28`
        : `${priorYear}-${todayMMDD}`;
    return {
      currentStart: `${year}-01-01`,
      currentEnd: today,
      previousStart: `${priorYear}-01-01`,
      previousEnd: priorEnd,
    };
  }, []);

  return (
    <CategoryComparisonCard
      defaultName={t('Year to date')}
      window={window}
      {...props}
    />
  );
}
