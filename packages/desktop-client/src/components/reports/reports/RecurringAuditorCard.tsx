// FINANCE FORK: Auto-detected recurring charges by payee.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { RecurringAuditorWidget } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getRecurringAuditorData,
  type RecurringAuditorData,
  type RecurringRow,
} from '#components/reports/spreadsheets/recurring-auditor-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { usePayeesById } from '#hooks/usePayees';

import { type PayeesById } from './SubscriptionsCard';

type RecurringAuditorCardProps = {
  isEditing?: boolean;
  meta?: RecurringAuditorWidget['meta'];
  onMetaChange: (newMeta: RecurringAuditorWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

const VISIBLE_ROWS = 8;

export function RecurringAuditorCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: RecurringAuditorCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const data = useReport<RecurringAuditorData>(
    'recurring-auditor',
    getRecurringAuditorData,
  );
  const { data: payeesById } = usePayeesById();

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
            name={meta?.name || t('Recurring Charges')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {data ? (
            <>
              <Block
                style={{
                  color: theme.pageText,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <PrivacyFilter>
                  {t('Next 30 days: {{amount}}', {
                    amount: format(data.next30DaysTotal, 'financial'),
                  })}
                </PrivacyFilter>
              </Block>
              <Block
                style={{ color: theme.pageTextSubdued, fontSize: 12 }}
              >
                {t('Auto-detected from {{count}} transactions', {
                  count: data.transactionsInspected,
                })}
              </Block>
            </>
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
          {!data ? (
            <LoadingIndicator />
          ) : data.rows.length === 0 ? (
            <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
              {t('No recurring charges detected.')}
            </Block>
          ) : (
            <RecurringList
              rows={data.rows}
              payeesById={payeesById}
            />
          )}
        </View>
      </View>
    </ReportCard>
  );
}

function RecurringList({
  rows,
  payeesById,
}: {
  rows: RecurringRow[];
  payeesById: PayeesById | undefined;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const visible = rows.slice(0, VISIBLE_ROWS);
  const overflow = rows.length - visible.length;

  return (
    <View style={{ gap: 10 }}>
      {visible.map(row => {
        const payeeName =
          payeesById?.[row.payee]?.name ?? t('Unknown payee');
        const lastChargedLabel = monthUtils.format(
          row.lastCharged,
          'MMM d, yyyy',
          locale,
        );
        return (
          <View key={row.payee} style={{ gap: 2 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span
                style={{
                  color: theme.tableText,
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {payeeName}
              </span>
              <span
                style={{
                  color: theme.tableText,
                  fontSize: 13,
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                <PrivacyFilter>
                  {`${format(row.monthlyCost, 'financial')} / mo · ${format(
                    row.annualCost,
                    'financial-no-decimals',
                  )} / yr`}
                </PrivacyFilter>
              </span>
            </View>
            <span
              style={{
                color: theme.pageTextSubdued,
                fontSize: 11,
              }}
            >
              {t('Last charged {{date}}', { date: lastChargedLabel })}
            </span>
          </View>
        );
      })}
      {overflow > 0 && (
        <Block style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
          {t('and {{count}} more', { count: overflow })}
        </Block>
      )}
    </View>
  );
}
