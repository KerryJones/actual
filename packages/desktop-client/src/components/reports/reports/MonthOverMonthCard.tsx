// FINANCE FORK: Month-over-month per-category expense comparison card.
// Window = current month vs previous month.
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import { CategoryComparisonCard } from './CategoryComparisonCard';
import type { CategoryComparisonMeta } from './CategoryComparisonCard';

type MonthOverMonthCardProps = {
  isEditing?: boolean;
  meta?: CategoryComparisonMeta;
  onMetaChange: (newMeta: CategoryComparisonMeta) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function MonthOverMonthCard(props: MonthOverMonthCardProps) {
  const { t } = useTranslation();

  const window = useMemo(() => {
    const currentMonth = monthUtils.currentMonth();
    const previousMonth = monthUtils.subMonths(currentMonth, 1);
    return {
      currentStart: currentMonth + '-01',
      currentEnd: monthUtils.getMonthEnd(currentMonth + '-01'),
      previousStart: previousMonth + '-01',
      previousEnd: monthUtils.getMonthEnd(previousMonth + '-01'),
    };
  }, []);

  return (
    <CategoryComparisonCard
      defaultName={t('Month over month')}
      window={window}
      {...props}
    />
  );
}
