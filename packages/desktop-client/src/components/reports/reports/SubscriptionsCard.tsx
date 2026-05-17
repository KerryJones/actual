// FINANCE FORK: Subscriptions hero card.
// Sums the monthly cost of all active recurring expense schedules.
// "Subscription" = any active recurring expense schedule. Includes mortgage,
// utilities, gym, Netflix — anything that recurs. Future filtering (e.g. exclude
// category "Bills") can be added via meta props.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { SummaryNumber } from '#components/reports/SummaryNumber';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { getMonthlyEquivalent } from '#components/reports/util-monthly-equivalent';
import { useFormat } from '#hooks/useFormat';
import { usePayeesById } from '#hooks/usePayees';
import { useSchedules } from '#hooks/useSchedules';

type SubscriptionsCardMeta = {
  name?: string;
} | null;

type SubscriptionsCardProps = {
  isEditing?: boolean;
  meta?: SubscriptionsCardMeta;
  onMetaChange: (newMeta: SubscriptionsCardMeta) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

const TOP_N = 5;

type SubscriptionRow = {
  id: string;
  label: string;
  monthly: number;
};

export function SubscriptionsCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: SubscriptionsCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules, isLoading } = useSchedules({ query: schedulesQuery });
  const { data: payeesById } = usePayeesById();

  const { total, top } = useMemo(
    () => summarizeSubscriptions(schedules, payeesById, t),
    [schedules, payeesById, t],
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
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <ReportCardName
          name={meta?.name || t('Monthly subscriptions')}
          isEditing={nameMenuOpen}
          onChange={newName => {
            onMetaChange({ ...meta, name: newName });
            setNameMenuOpen(false);
          }}
          onClose={() => setNameMenuOpen(false)}
        />
        <View style={{ flex: 1, minHeight: 80 }}>
          <SummaryNumber
            value={-total}
            contentType="financial"
            loading={isLoading}
          />
        </View>
        {!isLoading && top.length > 0 && (
          <View style={{ marginTop: 8, gap: 4 }}>
            {top.map(row => (
              <View
                key={row.id}
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
                  {row.label}
                </span>
                <span style={{ color: theme.pageTextLight, fontWeight: 500 }}>
                  <PrivacyFilter>{format(row.monthly, 'financial')}</PrivacyFilter>
                </span>
              </View>
            ))}
          </View>
        )}
      </View>
    </ReportCard>
  );
}

type PayeesById = Record<string, { name: string } | undefined>;

function summarizeSubscriptions(
  schedules: readonly ScheduleEntity[],
  payeesById: PayeesById | undefined,
  t: (k: string) => string,
): { total: number; top: SubscriptionRow[] } {
  const rows: SubscriptionRow[] = [];
  let total = 0;

  for (const schedule of schedules) {
    if (schedule.completed || schedule.tombstone) continue;
    if (typeof schedule._date === 'string') continue;
    const signed = getScheduledAmount(schedule._amount);
    if (signed >= 0) continue; // expenses only

    const monthly = getMonthlyEquivalent(signed, schedule._date);
    total += monthly;

    const label =
      schedule.name ||
      (schedule._payee && payeesById?.[schedule._payee]?.name) ||
      t('Unnamed schedule');

    rows.push({ id: schedule.id, label, monthly });
  }

  rows.sort((a, b) => b.monthly - a.monthly);
  return { total, top: rows.slice(0, TOP_N) };
}
