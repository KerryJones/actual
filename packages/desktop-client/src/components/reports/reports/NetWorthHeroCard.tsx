// FINANCE FORK: Net Worth hero with MoM delta + sparkline behind the number.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { NetWorthHeroWidget } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CompactAreaChart } from '#components/reports/charts/CompactAreaChart';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  createNetWorthTrendSpreadsheet,
  type NetWorthTrendData,
} from '#components/reports/spreadsheets/net-worth-trend-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';

type NetWorthHeroCardProps = {
  isEditing?: boolean;
  meta?: NetWorthHeroWidget['meta'];
  onMetaChange: (newMeta: NetWorthHeroWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function NetWorthHeroCard({
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: NetWorthHeroCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const getData = useMemo(() => createNetWorthTrendSpreadsheet(12), []);
  const data = useReport<NetWorthTrendData>('net-worth-hero', getData);

  const sparklineData = data
    ? data.months.map(p => ({ x: p.month, y: p.value }))
    : [];
  // MoM context is only meaningful with at least one prior data point;
  // for the first month of data, render no delta rather than a misleading
  // "+$X (+0% MoM)" string.
  const hasMoM = !!data && data.months.length > 1;
  const deltaSign = data ? Math.sign(data.momDelta) : 0;
  const deltaColor =
    deltaSign > 0
      ? theme.reportsNumberPositive
      : deltaSign < 0
        ? theme.reportsNumberNegative
        : theme.pageTextSubdued;
  const signPrefix = deltaSign > 0 ? '+' : deltaSign < 0 ? '−' : '';

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
      <View style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {data && data.months.length > 1 && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          >
            <CompactAreaChart
              data={sparklineData}
              color={theme.reportsBlue}
              height={120}
            />
          </View>
        )}
        <View
          style={{
            flexGrow: 0,
            flexShrink: 0,
            padding: 20,
            paddingBottom: 4,
          }}
        >
          <ReportCardName
            name={meta?.name || t('Net Worth')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({ ...meta, name: newName });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          {hasMoM && data ? (
            <Block style={{ color: deltaColor, fontSize: 13, fontWeight: 500 }}>
              <PrivacyFilter>
                {`${signPrefix}${format(Math.abs(data.momDelta), 'financial')} (${signPrefix}${(Math.abs(data.momPct) * 100).toFixed(1)}% MoM)`}
              </PrivacyFilter>
            </Block>
          ) : null}
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 60,
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 20,
          }}
        >
          {data ? (
            // SummaryNumber renders Math.abs(value) and conveys sign only via
            // color — fine for a savings rate, dangerous for a net worth hero
            // where "$25,000 in red" reads as $25k of assets. Render the value
            // with its native sign so negative net worth is unambiguous.
            <Block
              style={{
                ...styles.veryLargeText,
                fontWeight: 500,
                color:
                  data.netWorth < 0
                    ? theme.reportsNumberNegative
                    : theme.pageText,
                textAlign: 'center',
              }}
            >
              <PrivacyFilter>
                <FinancialText>
                  {format(data.netWorth, 'financial')}
                </FinancialText>
              </PrivacyFilter>
            </Block>
          ) : (
            <LoadingIndicator />
          )}
        </View>
      </View>
    </ReportCard>
  );
}
