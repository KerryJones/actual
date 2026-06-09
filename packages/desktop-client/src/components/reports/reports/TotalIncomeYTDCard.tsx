import React from 'react';
import { useTranslation } from 'react-i18next';

import { YTDFlowCard } from './YTDFlowCard';

type TotalIncomeYTDCardProps = {
  isEditing?: boolean;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function TotalIncomeYTDCard(props: TotalIncomeYTDCardProps) {
  const { t } = useTranslation();
  return (
    <YTDFlowCard kind="income" defaultName={t('Total Income (YTD)')} {...props} />
  );
}
