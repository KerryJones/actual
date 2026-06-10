import React from 'react';
import { useTranslation } from 'react-i18next';

import type { TotalExpensesYTDWidget } from '@actual-app/core/types/models';

import { YTDFlowCard } from './YTDFlowCard';

type TotalExpensesYTDCardProps = {
  isEditing?: boolean;
  meta?: TotalExpensesYTDWidget['meta'];
  onMetaChange: (newMeta: TotalExpensesYTDWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function TotalExpensesYTDCard(props: TotalExpensesYTDCardProps) {
  const { t } = useTranslation();
  return (
    <YTDFlowCard
      kind="expense"
      defaultName={t('Total Expenses (YTD)')}
      {...props}
    />
  );
}
