import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SankeyWidget } from '@actual-app/core/types/models';
import * as d from 'date-fns';

import { SankeyGraph } from '#components/reports/graphs/SankeyGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import {
  GraphLayers,
  createSpreadsheet as sankeySpreadsheet,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategories } from '#hooks/useCategories';
import { useLocale } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';

// Sentinel passed to useReport while cardHeight has not been measured yet.
// Module-level so its identity is stable across renders and useReport's
// effect does not loop. Resolves immediately without calling setData, so the
// hook keeps its initial null result and the LoadingIndicator stays visible.
const noopFetch = async () => undefined;

type SankeyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SankeyWidget['meta'];
  onMetaChange: (newMeta: SankeyWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};
export function SankeyCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
  onRemove,
  onCopy,
}: SankeyCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);
  const { data: { grouped: groupedCategories = [] } = { grouped: [] } } =
    useCategories();

  const [start, end] = calculateTimeRange(meta?.timeFrame);
  const mode = meta?.mode ?? 'spent';

  const [cardHeight, setCardHeight] = useState(0);
  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    setCardHeight(rect.height);
  });

  // Card uses the simplified 2-tier layout: one Income source → top N
  // CategoryGroups (+ Other). Pick the group cap from card height so a wider
  // card on a tall row gets one more group, but never above 6 (any more
  // collapses label legibility).
  const HEADER_HEIGHT = 82;
  const PX_PER_GROUP = 70;
  const cardSourceGroupCap = Math.max(
    3,
    Math.min(6, Math.floor((cardHeight - HEADER_HEIGHT) / PX_PER_GROUP)),
  );

  const isGraphLayer = (value: unknown): value is GraphLayers =>
    typeof value === 'string' &&
    (Object.values(GraphLayers) as string[]).includes(value);

  // Card defaults — spent mode collapses payees into a synthetic Income root
  // and shows only CategoryGroups on the right. Budgeted mode keeps the
  // existing income-category → category drill view (no synthesised root).
  // Each mode has exactly one valid layer pair on the card; persisted meta
  // is honored only when it matches that pair, otherwise we fall back to
  // the default. Any other combination would render blank because the
  // synthesised graph only emits Income + CategoryGroup nodes (spent) or
  // the standard IncomeCategory → Category graph (budgeted).
  const ALLOWED_FROM: Record<'spent' | 'budgeted', readonly GraphLayers[]> = {
    spent: [GraphLayers.Income],
    budgeted: [GraphLayers.IncomeCategory],
  };
  const ALLOWED_TO: Record<'spent' | 'budgeted', readonly GraphLayers[]> = {
    spent: [GraphLayers.CategoryGroup],
    budgeted: [GraphLayers.Category],
  };

  const defaultLayerFrom = ALLOWED_FROM[mode][0];
  const defaultLayerTo = ALLOWED_TO[mode][0];

  const metaLayerFrom = isGraphLayer(meta?.layerFrom)
    ? meta.layerFrom
    : undefined;
  const metaLayerTo = isGraphLayer(meta?.layerTo) ? meta.layerTo : undefined;

  const layerFrom =
    metaLayerFrom && ALLOWED_FROM[mode].includes(metaLayerFrom)
      ? metaLayerFrom
      : defaultLayerFrom;
  const layerTo =
    metaLayerTo && ALLOWED_TO[mode].includes(metaLayerTo)
      ? metaLayerTo
      : defaultLayerTo;

  // Spent (synthesised) mode wants magnitude-first ordering so the eye lands
  // on the biggest flow. The synthesised graph has no Category-layer leaves
  // for per-group sort to operate on, so per-group would silently no-op into
  // insertion order — force global. Budgeted falls back to the spreadsheet's
  // signature default ('per-group') unless meta overrides it.
  const categorySort =
    mode === 'spent' ? 'global' : (meta?.categorySort ?? 'per-group');

  // Card never includes transfers — Starting Balance and account-to-account
  // moves are not income or expense. Drill-down has a toggle for the audit
  // path.
  //
  // Wait for the ResizeObserver to deliver a real height before issuing the
  // query. Otherwise the first render uses cardHeight=0 → cardSourceGroupCap
  // clamps to the floor (3), fetches, and then re-fetches once the real
  // height arrives — a visible flicker and a wasted SQLite roundtrip per
  // mount. Pass undefined to useReport while we wait, which keeps the
  // LoadingIndicator visible.
  const params = useMemo(
    () =>
      sankeySpreadsheet(
        start,
        end,
        groupedCategories,
        meta?.conditions ?? [],
        meta?.conditionsOp ?? 'and',
        mode,
        meta?.topNcategories ?? cardSourceGroupCap,
        categorySort,
        layerFrom,
        layerTo,
        false,
        cardSourceGroupCap,
      ),
    [
      start,
      end,
      groupedCategories,
      meta?.conditions,
      meta?.conditionsOp,
      mode,
      meta?.topNcategories,
      cardSourceGroupCap,
      categorySort,
      layerFrom,
      layerTo,
    ],
  );
  // Wait for the ResizeObserver to deliver a real height before issuing the
  // query. With cardHeight=0 on the first render, cardSourceGroupCap clamps
  // to its floor (3) and the spreadsheet is fetched against the wrong cap;
  // when the real height lands the cap changes and we requery — visible
  // flicker and a wasted SQLite roundtrip per mount.
  const data = useReport('sankey', cardHeight > 0 ? params : noopFetch);

  const startDate = d.parseISO(start);
  const endDate = d.parseISO(end);
  const formattedStartDate = d.format(startDate, 'MMM yyyy', { locale });
  const formattedEndDate = d.format(endDate, 'MMM yyyy', { locale });

  let dateDescription: string | ReactElement;
  if (
    startDate.getFullYear() !== endDate.getFullYear() ||
    startDate.getMonth() !== endDate.getMonth()
  ) {
    dateDescription = formattedStartDate + ' - ' + formattedEndDate;
  } else {
    dateDescription = formattedEndDate;
  }

  const modeLabel = mode === 'budgeted' ? t('Budgeted') : t('Spent');

  dateDescription += ` (${modeLabel})`;

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/sankey/${widgetId}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
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
      <View ref={containerRef} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Sankey')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <Block style={{ color: theme.pageTextSubdued }}>
              {dateDescription}
            </Block>
          </View>
        </View>

        {data ? (
          <SankeyGraph
            data={data}
            showPercentages={meta?.showPercentages}
            showTooltip={!isEditing}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
