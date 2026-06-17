// FINANCE FORK: FI progress hero card with capped progress bar.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  FIProgressWidget,
} from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { ProgressBar } from '#components/reports/charts/ProgressBar';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  createFIProgressSpreadsheet,
  type FIProgressData,
} from '#components/reports/spreadsheets/fi-progress-spreadsheet';
import { SummaryNumber } from '#components/reports/SummaryNumber';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';

type FIProgressCardProps = {
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: FIProgressWidget['meta'];
  onMetaChange: (newMeta: FIProgressWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function FIProgressCard({
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: FIProgressCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const getData = useMemo(
    () => createFIProgressSpreadsheet(accounts),
    [accounts],
  );
  const data = useReport<FIProgressData>('fi-progress', getData);

  const barPct = data ? Math.min(100, Math.max(0, data.progress * 100)) : 0;
  const remainingTarget = data ? Math.max(0, data.fiTarget - data.netWorth) : 0;
  const yearsRemaining =
    data && data.annualNet > 0 ? remainingTarget / data.annualNet : null;

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
            name={meta?.name || t('FI Progress')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {data ? (
            <>
              <Block style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
                <PrivacyFilter>
                  {t('of {{target}} FI target', {
                    target: format(data.fiTarget, 'financial'),
                  })}
                </PrivacyFilter>
              </Block>
              {yearsRemaining != null ? (
                <Block style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
                  <PrivacyFilter>
                    {t('{{years}} years at current pace', {
                      years: yearsRemaining.toFixed(1),
                    })}
                  </PrivacyFilter>
                </Block>
              ) : null}
            </>
          ) : null}
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 60,
          }}
        >
          {data ? (
            <SummaryNumber
              value={data.netWorth}
              contentType="sum"
              loading={false}
            />
          ) : (
            <LoadingIndicator />
          )}
        </View>
        {data && (
          <View
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Block
                style={{
                  color: theme.pageTextSubdued,
                  fontSize: 12,
                  minWidth: 36,
                }}
              >
                {`${Math.round(data.progress * 100)}%`}
              </Block>
              <View style={{ flex: 1 }}>
                <ProgressBar percent={barPct} color={theme.reportsBlue} />
              </View>
            </View>
          </View>
        )}
      </View>
    </ReportCard>
  );
}
