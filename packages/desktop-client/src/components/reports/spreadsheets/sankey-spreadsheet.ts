import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { t } from 'i18next';

import { getColorScale } from '#components/reports/chart-theme';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

type BudgetMonthCategory = {
  id: string;
  name: string;
  spent?: number;
  budgeted?: number;
  balance?: number;
  received?: number;
};

type BudgetMonthGroup = {
  id: string;
  name: string;
  is_income: boolean;
  categories: BudgetMonthCategory[];
};

type BudgetMonthResponse = {
  categoryGroups: BudgetMonthGroup[];
  totalIncome: number;
  fromLastMonth: number;
  forNextMonth: number;
  lastMonthOverspent: number;
  toBudget: number;
};

type AggregatedBudget = {
  toBudget: number;
  fromPreviousMonth: number;
  lastMonthOverspent: number;
  categoryGroupsMap: Map<string, BudgetMonthGroup>;
  forNextMonth: number;
  startMonth: string;
  endMonth: string;
};

type SankeyNode = {
  name: string;
  percentageLabel?: string;
  key: string;
  color?: string;
};

type SankeyLink = {
  source: number;
  target: number;
  value: number;
  tooltipInfo?: Array<{ name: string; value: number }>;
  color?: string;
};

type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

type CategoryEntry = {
  categoryGroup: string;
  categoryGroupId: string;
  category: string;
  categoryId: string;
  value: number;
  isIncome: boolean;
  accountName?: string;
  accountId?: string;
  payeeName?: string;
  payeeId?: string;
};

type SortMode = 'per-group' | 'global' | 'budget-order';

type NodeKey = string;
type NodeData = {
  to: Map<NodeKey, number>;
  value?: number;
  type: string;
  name?: string;
  labelKey?: string;
  labelParams?: Record<string, string>;
  isOverbudgeted?: boolean;
  tooltipInfo?: Array<{ name: string; value: number }>;
  percentageLabel?: string;
  color?: string;
};
type Graph = Map<NodeKey, NodeData>;

const SpecialNodeKeys = {
  ToBudget: 'to_budget',
  Budgeted: 'budgeted',
  LastMonthOverspent: 'last_month_overspent',
  ForNextMonth: 'for_next_month',
  FromPrevMonth: 'from_previous_month',
  AvailableIncome: 'available_income',
  GlobalOther: 'GLOBAL__OTHER_BUCKET',
  OtherSuffix: '__OTHER_BUCKET',
  HiddenSuffix: '__HIDDEN',
} as const;
type SpecialNodeKeys = (typeof SpecialNodeKeys)[keyof typeof SpecialNodeKeys];

export const GraphLayers = {
  // Synthetic single-source root used by the overview-card 2-tier view
  // (Income → CategoryGroups). The drill-down does not expose this layer in
  // its selector; it is only produced when a caller asks for it via
  // layerFrom === Income.
  Income: 'income_root',
  IncomePayee: 'payee',
  IncomeCategory: 'income_category',
  Account: 'account',
  Budget: 'budget',
  CategoryGroup: 'category_group',
  Category: 'category',
} as const;
export type GraphLayers = (typeof GraphLayers)[keyof typeof GraphLayers];

export const GRAPH_LAYER_ORDER = [
  GraphLayers.Income,
  GraphLayers.IncomePayee,
  GraphLayers.IncomeCategory,
  GraphLayers.Account,
  GraphLayers.Budget,
  GraphLayers.CategoryGroup,
  GraphLayers.Category,
] as const;

const INCOME_ROOT_KEY = GraphLayers.Income;
const INCOME_ROOT_OTHER_KEY = `${INCOME_ROOT_KEY}${SpecialNodeKeys.OtherSuffix}`;
const DEFAULT_CARD_GROUP_CAP = 6;
const MIN_LAYER_PERCENT = 0.005;

function isGraphLayer(value: unknown): value is GraphLayers {
  return (
    typeof value === 'string' &&
    (Object.values(GraphLayers) as string[]).includes(value)
  );
}

export function createSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  mode: 'budgeted' | 'spent' = 'spent',
  topNcategories: number = 15,
  categorySort: SortMode = 'per-group',
  layerFrom: GraphLayers,
  layerTo: GraphLayers,
  includeTransfers: boolean = false,
  cardSourceGroupCap: number = DEFAULT_CARD_GROUP_CAP,
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  ) => {
    let data: CategoryEntry[] = [];
    let aggregated: AggregatedBudget | undefined;
    if (mode === 'budgeted') {
      ({ data, aggregated } = await createBudgetSpreadsheet(
        start,
        end,
        conditions,
        conditionsOp,
      )());
    } else if (mode === 'spent') {
      data = await createTransactionsSpreadsheet(
        start,
        end,
        categories,
        conditions,
        conditionsOp,
        includeTransfers,
      )();
    }
    processGraphData(
      data,
      topNcategories,
      categories,
      categorySort,
      setData,
      layerFrom,
      layerTo,
      cardSourceGroupCap,
      aggregated,
    );
  };
}

export function createBudgetSpreadsheet(
  start: string,
  end: string,
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  return async () => {
    const months =
      end && end !== start ? monthUtils.rangeInclusive(start, end) : [start];

    const monthResponses = await Promise.all(
      months.map(
        m =>
          send('api/budget-month', {
            month: m,
          }) as unknown as Promise<BudgetMonthResponse>,
      ),
    );

    const accumulate_months = monthResponses.reduce(
      (acc, response, index) => {
        if (index === monthResponses.length - 1) {
          acc.toBudget = response.toBudget;
        }
        if (index === 0) {
          acc.fromPreviousMonth = response.fromLastMonth;
        }
        acc.lastMonthOverspent += response.lastMonthOverspent;

        for (const group of response.categoryGroups) {
          const existingGroup = acc.categoryGroupsMap.get(group.id);
          if (!existingGroup) {
            acc.categoryGroupsMap.set(group.id, {
              ...group,
              categories: group.categories.map(cat => ({ ...cat })),
            });
            continue;
          }

          for (const cat of group.categories) {
            const existingCat = existingGroup.categories.find(
              c => c.id === cat.id,
            );
            if (!existingCat) {
              existingGroup.categories.push({ ...cat });
              continue;
            }
            existingCat.budgeted =
              (existingCat.budgeted ?? 0) + (cat.budgeted ?? 0);
            existingCat.spent = (existingCat.spent ?? 0) + (cat.spent ?? 0);
            existingCat.balance =
              (existingCat.balance ?? 0) + (cat.balance ?? 0);
            existingCat.received =
              (existingCat.received ?? 0) + (cat.received ?? 0);
          }
        }

        return acc;
      },
      {
        toBudget: 0,
        fromPreviousMonth: 0,
        lastMonthOverspent: 0,
        categoryGroupsMap: new Map<string, BudgetMonthGroup>(),
      },
    );

    const categoryGroups = Array.from(
      accumulate_months.categoryGroupsMap.values(),
    );

    const filteredCategoryGroups = filterCategoryGroups(
      categoryGroups,
      conditions,
      conditionsOp,
    );

    const categoryData: CategoryEntry[] = filteredCategoryGroups
      .flatMap(group =>
        group.categories.map(cat => {
          const rawValue = group.is_income
            ? (cat.received ?? 0)
            : (cat.budgeted ?? 0);
          return {
            categoryGroup: group.name,
            categoryGroupId: group.id,
            category: cat.name,
            categoryId: cat.id,
            isIncome: group.is_income ? rawValue > 0 : rawValue < 0,
            value: Math.abs(rawValue),
          };
        }),
      )
      .filter(entry => entry.value > 0);

    const nextMonthResponse = (await send('api/budget-month', {
      month: monthUtils.nextMonth(end),
    })) as unknown as BudgetMonthResponse;

    const aggregated: AggregatedBudget = {
      toBudget: accumulate_months.toBudget,
      forNextMonth:
        (nextMonthResponse.fromLastMonth ?? 0) - accumulate_months.toBudget,
      fromPreviousMonth: accumulate_months.fromPreviousMonth,
      lastMonthOverspent: accumulate_months.lastMonthOverspent,
      categoryGroupsMap: accumulate_months.categoryGroupsMap,
      startMonth: start,
      endMonth: end,
    };

    return { data: categoryData, aggregated };
  };
}

export function createTransactionsSpreadsheet(
  start: string,
  end: string,
  categories: CategoryGroupEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
  includeTransfers: boolean = false,
) {
  return async () => {
    // gather filters user has set
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const categoryData = await fetchCategoryData(
      categories,
      conditionsOpKey,
      filters,
      start,
      end,
      includeTransfers,
    );

    return categoryData;
  };
}

function processGraphData(
  categoryData: CategoryEntry[],
  topNcategories: number,
  categories: CategoryGroupEntity[],
  categorySort: SortMode,
  setData: (data: ReturnType<typeof convertToSankeyData>) => void,
  layerFrom: GraphLayers,
  layerTo: GraphLayers,
  cardSourceGroupCap: number,
  aggregated?: AggregatedBudget,
) {
  let graph: Graph;
  if (aggregated) {
    graph = createBudgetGraph(categoryData, aggregated);
  } else {
    // The card-level 2-tier view collapses all income into a synthetic root
    // node and emits one outgoing link per CategoryGroup. Detected by
    // layerFrom — the drill-down never selects this layer.
    const synthesizeIncomeRoot = layerFrom === GraphLayers.Income;
    graph = createTransactionsGraph(
      categoryData,
      synthesizeIncomeRoot,
      cardSourceGroupCap,
    );
  }
  groupOtherCategories(graph, topNcategories, categorySort);
  const sortedGraph = sortGraph(graph, categorySort, categories);
  addPercentageLabels(sortedGraph);
  addColors(sortedGraph);
  filterGraphByLayers(sortedGraph, layerFrom, layerTo);
  cleanUpNodes(sortedGraph);
  setData(convertToSankeyData(sortedGraph));
}

// Filter budget category groups to only those matching the user's conditions.
// Budget data is fetched unconditionally from api/budget-month, so we must
// apply category conditions manually in JS (unlike the transaction path which
// passes conditions directly into the AQL query).
function filterCategoryGroups(
  categoryGroups: BudgetMonthGroup[],
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
): BudgetMonthGroup[] {
  const categoryConditions = conditions.filter(
    cond => cond.field === GraphLayers.Category,
  );
  const categoryGroupConditions = conditions.filter(
    cond => cond.field === GraphLayers.CategoryGroup,
  );

  if (categoryConditions.length === 0 && categoryGroupConditions.length === 0) {
    return categoryGroups;
  }

  const matchesStringCondition = (
    id: string,
    name: string,
    cond: RuleConditionEntity,
  ): boolean => {
    const value = cond.value;
    if (typeof cond.op !== 'string') {
      throw new Error('Invalid op');
    }
    const op = cond.op;
    if (op === 'is') return id === value;
    if (op === 'isNot') return id !== value;
    if (op === 'oneOf') return Array.isArray(value) && value.includes(id);
    if (op === 'notOneOf') return !Array.isArray(value) || !value.includes(id);
    if (op === 'contains') {
      return (
        typeof value === 'string' &&
        name.toLowerCase().includes(value.toLowerCase())
      );
    }
    if (op === 'doesNotContain') {
      return (
        typeof value === 'string' &&
        !name.toLowerCase().includes(value.toLowerCase())
      );
    }
    if (op === 'matches') {
      if (typeof value !== 'string') return false;
      if (value.length > 256) return false;
      try {
        const regex =
          value.startsWith('/') && value.lastIndexOf('/') > 0
            ? new RegExp(value.slice(1, value.lastIndexOf('/')), 'i')
            : new RegExp(value, 'i');
        return regex.test(name);
      } catch {
        return false;
      }
    }
    return false;
  };

  const categoryMatchesConditions = (
    catId: string,
    catName: string,
    groupId: string,
    groupName: string,
  ): boolean => {
    const matchesCat = (cond: RuleConditionEntity) =>
      matchesStringCondition(catId, catName, cond);
    const matchesGroup = (cond: RuleConditionEntity) =>
      matchesStringCondition(groupId, groupName, cond);

    if (conditionsOp === 'or') {
      return (
        categoryConditions.some(matchesCat) ||
        categoryGroupConditions.some(matchesGroup)
      );
    }
    // 'and': all category conditions AND all category_group conditions must match
    const catMatch =
      categoryConditions.length === 0 || categoryConditions.every(matchesCat);
    const groupMatch =
      categoryGroupConditions.length === 0 ||
      categoryGroupConditions.every(matchesGroup);
    return catMatch && groupMatch;
  };

  return categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories.filter(cat =>
        categoryMatchesConditions(cat.id, cat.name, group.id, group.name),
      ),
    }))
    .filter(group => group.categories.length > 0);
}

// retrieve sum of group expenses
async function fetchCategoryData(
  categoryGroups: CategoryGroupEntity[],
  conditionsOpKey: string = '$and',
  filters: unknown[] = [],
  start: string,
  end: string,
  includeTransfers: boolean = false,
): Promise<CategoryEntry[]> {
  // Data hygiene: exclude account-init seed rows (Starting Balance) and
  // account-to-account transfers. These dominate by magnitude but are not
  // real income or expense — they are account plumbing. Drill-down can opt
  // back in via the Include transfers toggle.
  const transferExclusionFilters: Record<string, unknown>[] = includeTransfers
    ? []
    : [
        { starting_balance_flag: { $ne: true } },
        { 'payee.transfer_acct': null },
      ];

  const nested = await Promise.all(
    categoryGroups.map(async (categoryGroup: CategoryGroupEntity) => {
      const entries = await Promise.all(
        (categoryGroup.categories || []).map(async category => {
          const results = await aqlQuery(
            q('transactions')
              .filter({ [conditionsOpKey]: filters })
              .filter({
                $and: [
                  { date: { $gte: monthUtils.firstDayOfMonth(start) } },
                  { date: { $lte: monthUtils.lastDayOfMonth(end) } },
                  ...transferExclusionFilters,
                ],
              })
              .filter({ category: category.id })
              .groupBy(
                categoryGroup.is_income
                  ? [
                      { $id: '$category' },
                      { $id: '$account' },
                      { $id: '$payee' },
                    ]
                  : [{ $id: '$category' }, { $id: '$account' }],
              )
              .select([
                { accountId: { $id: '$account.id' } },
                { accountName: { $id: '$account.name' } },
                { amount: { $sum: '$amount' } },
                { payeeId: { $id: '$payee.id' } },
                { payeeName: { $id: '$payee.name' } },
              ]),
          );
          return results.data
            .filter(
              (row: { amount?: number }) =>
                categoryGroup.is_income || (row.amount ?? 0) < 0,
            )
            .map(
              (row: {
                amount?: number;
                accountName?: string;
                accountId?: string;
                payeeName?: string;
                payeeId?: string;
              }) =>
                ({
                  categoryGroup: categoryGroup.name,
                  categoryGroupId: categoryGroup.id,
                  category: category.name,
                  categoryId: category.id,
                  value: Math.abs(row.amount ?? 0),
                  isIncome: categoryGroup.is_income ?? false,
                  accountName: row.accountName ?? '',
                  accountId: row.accountId ?? '',
                  payeeName: row.payeeName ?? '',
                  payeeId: row.payeeId ?? '',
                }) satisfies CategoryEntry,
            );
        }),
      );
      return entries.flat();
    }),
  );
  return nested.flat().filter(e => e.value > 0);
}

function createBudgetGraph(
  categoryData: CategoryEntry[],
  aggregated: AggregatedBudget,
): Graph {
  const graph: Graph = new Map();

  // Add initial budget nodes with no links
  addNodeWithLabel(
    graph,
    SpecialNodeKeys.Budgeted,
    GraphLayers.Budget,
    'Budgeted',
  );
  addNodeWithLabel(
    graph,
    SpecialNodeKeys.AvailableIncome,
    GraphLayers.Account,
    'Available funds',
  );

  categoryData.forEach(entry => {
    if (entry.isIncome) {
      // Income category > Available income
      addNode(
        graph,
        entry.categoryId,
        GraphLayers.IncomeCategory,
        entry.category,
      );
      addValueToLink(
        graph,
        entry.categoryId,
        SpecialNodeKeys.AvailableIncome,
        entry.value,
      );
    } else {
      // Budgeted > Category group > Category
      addNode(
        graph,
        entry.categoryGroupId,
        GraphLayers.CategoryGroup,
        entry.categoryGroup,
      );
      addNode(graph, entry.categoryId, GraphLayers.Category, entry.category);
      addValueToLink(
        graph,
        entry.categoryGroupId,
        entry.categoryId,
        entry.value,
      );
      addValueToLink(
        graph,
        SpecialNodeKeys.Budgeted,
        entry.categoryGroupId,
        entry.value,
      );
      addValueToLink(
        graph,
        SpecialNodeKeys.AvailableIncome,
        SpecialNodeKeys.Budgeted,
        entry.value,
      );
    }
  });

  if (aggregated.toBudget > 0) {
    addNodeWithLabel(
      graph,
      SpecialNodeKeys.ToBudget,
      GraphLayers.Budget,
      'To budget',
    );
    addValueToLink(
      graph,
      SpecialNodeKeys.AvailableIncome,
      SpecialNodeKeys.ToBudget,
      aggregated.toBudget,
    );
  } else {
    addNodeWithLabel(
      graph,
      SpecialNodeKeys.ToBudget,
      GraphLayers.Budget,
      'Overbudgeted',
      undefined,
      true,
    );
    addValueToLink(
      graph,
      SpecialNodeKeys.ToBudget,
      SpecialNodeKeys.AvailableIncome,
      Math.abs(aggregated.toBudget),
    );
  }

  addNodeWithLabel(
    graph,
    SpecialNodeKeys.FromPrevMonth,
    GraphLayers.IncomeCategory,
    'From {{month}}',
    { month: monthUtils.prevMonth(aggregated.startMonth) },
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.FromPrevMonth,
    SpecialNodeKeys.AvailableIncome,
    aggregated.fromPreviousMonth,
  );
  addNodeWithLabel(
    graph,
    SpecialNodeKeys.ForNextMonth,
    GraphLayers.Budget,
    'For {{month}}',
    { month: monthUtils.nextMonth(aggregated.endMonth) },
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.AvailableIncome,
    SpecialNodeKeys.ForNextMonth,
    aggregated.forNextMonth,
  );
  addNodeWithLabel(
    graph,
    SpecialNodeKeys.LastMonthOverspent,
    GraphLayers.Budget,
    'Overspent',
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.AvailableIncome,
    SpecialNodeKeys.LastMonthOverspent,
    Math.abs(aggregated.lastMonthOverspent),
  );

  // Add extra synthetic links to position nodes at the right layers.
  // If the nodes don't exist, a link will not be created, so this is not seen in the graph.
  addValueToLink(
    graph,
    SpecialNodeKeys.ToBudget,
    'to_budget' + SpecialNodeKeys.HiddenSuffix,
    -1,
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.ForNextMonth,
    'next_month' + SpecialNodeKeys.HiddenSuffix,
    -1,
  );
  addValueToLink(
    graph,
    SpecialNodeKeys.LastMonthOverspent,
    'overspent' + SpecialNodeKeys.HiddenSuffix,
    -1,
  );

  return graph;
}

function createTransactionsGraph(
  categoryData: CategoryEntry[],
  synthesizeIncomeRoot: boolean = false,
  topGroups: number = DEFAULT_CARD_GROUP_CAP,
): Graph {
  const graph: Graph = new Map();

  if (synthesizeIncomeRoot) {
    // 2-tier "where did my money go" view: one Income source → top N
    // CategoryGroups + Other. Income entries are intentionally dropped — the
    // card visualises outflow, and the source-node height equals the sum of
    // its outgoing links.
    const groupTotals = new Map<string, { name: string; value: number }>();
    for (const entry of categoryData) {
      if (entry.isIncome) continue;
      const prev = groupTotals.get(entry.categoryGroupId);
      if (prev) {
        prev.value += entry.value;
      } else {
        groupTotals.set(entry.categoryGroupId, {
          name: entry.categoryGroup,
          value: entry.value,
        });
      }
    }

    const sortedGroups = Array.from(groupTotals.entries()).sort(
      ([, a], [, b]) => b.value - a.value,
    );
    let top = sortedGroups.slice(0, topGroups);
    let rest = sortedGroups.slice(topGroups);
    // One leftover renders better as its named band than as an "Other" bucket
    // of size one (whose only tooltip entry is itself).
    if (rest.length === 1) {
      top = top.concat(rest);
      rest = [];
    }

    addNodeWithLabel(graph, INCOME_ROOT_KEY, GraphLayers.Income, 'Income');

    for (const [groupId, { name, value }] of top) {
      addNode(graph, groupId, GraphLayers.CategoryGroup, name);
      addValueToLink(graph, INCOME_ROOT_KEY, groupId, value);
    }

    if (rest.length > 0) {
      const otherValue = rest.reduce((sum, [, v]) => sum + v.value, 0);
      // Skip the Other bucket entirely if every leftover sums to zero —
      // cleanUpNodes would prune the link, but the tooltipInfo on the root
      // would still reference $0 entries that the user never sees.
      if (otherValue > 0) {
        addNodeWithLabel(
          graph,
          INCOME_ROOT_OTHER_KEY,
          GraphLayers.CategoryGroup,
          'Other',
        );
        addValueToLink(
          graph,
          INCOME_ROOT_KEY,
          INCOME_ROOT_OTHER_KEY,
          otherValue,
        );
        const rootNode = graph.get(INCOME_ROOT_KEY);
        if (rootNode) {
          rootNode.tooltipInfo = rest
            .filter(([, v]) => v.value > 0)
            .map(([, v]) => ({ name: v.name, value: v.value }))
            .sort((a, b) => b.value - a.value);
        }
      }
    }

    return graph;
  }

  categoryData.forEach(entry => {
    if (entry.isIncome) {
      // Payee > Income category. Skip entries without a payee — the
      // IncomeCategory would otherwise be added as an orphan node and dropped
      // by cleanUpNodes, silently discarding the value.
      if (!entry.payeeId) return;
      addNode(
        graph,
        entry.categoryId,
        GraphLayers.IncomeCategory,
        entry.category,
      );
      addNode(graph, entry.payeeId, GraphLayers.IncomePayee, entry.payeeName);
      addValueToLink(graph, entry.payeeId, entry.categoryId, entry.value);
    } else {
      // Category group > Category
      addNode(
        graph,
        entry.categoryGroupId,
        GraphLayers.CategoryGroup,
        entry.categoryGroup,
      );
      addNode(graph, entry.categoryId, GraphLayers.Category, entry.category);
      addValueToLink(
        graph,
        entry.categoryGroupId,
        entry.categoryId,
        entry.value,
      );
    }
  });

  return graph;
}

function addNode(graph: Graph, key: NodeKey, type: GraphLayers, name?: string) {
  if (!graph.has(key)) {
    graph.set(key, {
      to: new Map(),
      type,
      name,
    });
  }
}

function addNodeWithLabel(
  graph: Graph,
  key: NodeKey,
  type: GraphLayers,
  labelKey: string,
  labelParams?: Record<string, string>,
  isOverbudgeted?: boolean,
) {
  if (!graph.has(key)) {
    graph.set(key, {
      to: new Map(),
      type,
      labelKey,
      labelParams,
      isOverbudgeted,
    });
  }
}

function addValueToLink(
  graph: Graph,
  from: NodeKey,
  to: NodeKey,
  value: number,
) {
  const fromNode = graph.get(from);
  if (fromNode) {
    fromNode.to.set(to, (fromNode.to.get(to) ?? 0) + value);
  }
}

function getLayer(graph: Graph, key: NodeKey): number {
  // Find parent nodes for the given key
  const parents: NodeKey[] = [];
  for (const [parentKey, data] of graph) {
    if (data.to.has(key)) {
      parents.push(parentKey);
    }
  }
  if (parents.length === 0) {
    // No parents: this is a root node, layer 0
    return 0;
  }
  // Otherwise, 1 + max parent's layer
  return 1 + Math.max(...parents.map(parentKey => getLayer(graph, parentKey)));
}

function groupOtherCategories(
  graph: Graph,
  topN: number,
  categorySort: SortMode = 'per-group',
) {
  // For each category group, find the top N categories by total value and
  // group the rest into "Other". Also enforce a percentage floor: any
  // category below MIN_LAYER_PERCENT of the largest in its layer is bucketed,
  // even if we're already under topN. Prevents the 270:1 dynamic-range
  // collapse where small flows render as zero-width strokes.
  // Floor topN at 1 so a degenerate persisted value (0) does not collapse
  // every category in O(N²).
  const effectiveTopN = Math.max(1, topN);
  const deletedNodes = new Map<NodeKey, { key: NodeKey; data: NodeData }[]>();
  // Keys bucketed because they sat below the percentage floor (vs the topN
  // cap). promoteOtherBack restores singleton Others to keep small groups
  // readable, but a floor-bucketed singleton MUST stay collapsed — otherwise
  // it un-buckets and we're back to the zero-width-stroke problem this
  // function was extended to solve.
  const floorBucketed = new Set<NodeKey>();

  // Working set of "active" category keys — the source of truth for the loop.
  // Each iteration either removes one key via moveToOther + graph.delete, or
  // discards an orphan key directly (no graph mutation). Both shrink the set
  // so the loop always makes forward progress and cannot spin.
  const active = new Set<NodeKey>(
    nodesInLayer(graph, GraphLayers.Category).filter(
      s => !s.endsWith(SpecialNodeKeys.OtherSuffix),
    ),
  );

  while (active.size > 0) {
    const values = new Map<NodeKey, number>();
    graph.forEach(data => {
      data.to.forEach((v, k) => {
        if (active.has(k)) values.set(k, (values.get(k) ?? 0) + v);
      });
    });
    let categoryToDelete: NodeKey | undefined;
    let min = Infinity;
    let maxValue = 0;
    for (const k of active) {
      const val = values.get(k) ?? 0;
      if (val > maxValue) maxValue = val;
      if (val < min) {
        min = val;
        categoryToDelete = k;
      }
    }

    const threshold = maxValue * MIN_LAYER_PERCENT;
    const overTopN = active.size > effectiveTopN;
    const belowFloor = min < threshold;
    if (!overTopN && !belowFloor) break;

    if (categoryToDelete === undefined) break; // safety

    const categoryGroupResult = getCategoryGroup(graph, categoryToDelete);
    if (!categoryGroupResult) {
      console.error(
        `Failed to find category group for category: ${categoryToDelete}`,
      );
      active.delete(categoryToDelete);
      continue;
    }

    const deletedCategoryGroupKey = categoryGroupResult[0];
    const nodeData = graph.get(categoryToDelete);
    if (!nodeData) {
      console.error(
        `Failed to find node data for category: ${categoryToDelete}`,
      );
      active.delete(categoryToDelete);
      continue;
    }

    const deletedCategoryGroup = deletedNodes.get(deletedCategoryGroupKey);
    if (!deletedCategoryGroup) {
      deletedNodes.set(deletedCategoryGroupKey, [
        { key: categoryToDelete, data: nodeData },
      ]);
    } else {
      deletedCategoryGroup.push({ key: categoryToDelete, data: nodeData });
    }

    if (belowFloor) {
      floorBucketed.add(categoryToDelete);
    }
    moveToOther(graph, categoryToDelete, categorySort === 'global');
    graph.delete(categoryToDelete);
    active.delete(categoryToDelete);
  }

  promoteOtherBack(
    graph,
    deletedNodes,
    categorySort === 'global',
    floorBucketed,
  );
}

function nodesInLayer(graph: Graph, layer: GraphLayers): NodeKey[] {
  return Array.from(graph)
    .filter(([, data]) => data.type === layer)
    .map(([key]) => key);
}

function moveToOther(graph: Graph, key: NodeKey, globalOther: boolean = false) {
  const categoryGroup = getCategoryGroup(graph, key);
  if (!categoryGroup) {
    console.error(`moveToOther: Failed to find category group for key: ${key}`);
    return;
  }

  const categoryGroupKey = categoryGroup[0];
  const categoryGroupData = categoryGroup[1];
  const categoryValue = categoryGroupData.to.get(key);

  if (categoryValue === undefined) {
    console.error(
      `moveToOther: No link value found from group ${categoryGroupKey} to ${key}`,
    );
    return;
  }

  let otherGroupKey: NodeKey;
  if (globalOther) {
    otherGroupKey = SpecialNodeKeys.GlobalOther;
  } else {
    otherGroupKey = categoryGroupKey + SpecialNodeKeys.OtherSuffix;
  }

  addNodeWithLabel(graph, otherGroupKey, GraphLayers.Category, 'Other');
  addValueToLink(graph, categoryGroupKey, otherGroupKey, categoryValue);
  addTooltipInfo(graph, categoryGroupKey, key, categoryValue);
  deleteLink(graph, categoryGroupKey, key);
}

function addTooltipInfo(
  graph: Graph,
  from: NodeKey,
  to: NodeKey,
  value: number,
) {
  const fromNode = graph.get(from);
  if (!fromNode) return;
  fromNode.tooltipInfo = fromNode.tooltipInfo ?? [];
  fromNode.tooltipInfo.push({ name: graph.get(to)?.name ?? to, value });
}

function getCategoryGroup(graph: Graph, key: NodeKey) {
  return Array.from(graph).filter(
    ([, data]) => data.to.has(key) && data.type === GraphLayers.CategoryGroup,
  )[0];
}

function deleteLink(graph: Graph, from: NodeKey, to: NodeKey) {
  const fromNode = graph.get(from);
  if (fromNode) {
    fromNode.to.delete(to);
  }
}

function promoteOtherBack(
  graph: Graph,
  deletedNodes: Map<string, { key: string; data: NodeData }[]>,
  globalOther: boolean = false,
  floorBucketed: Set<NodeKey> = new Set(),
) {
  // If an Other node only contains one category, we revert it to an ordinary
  // node — UNLESS that category was bucketed for falling below the visibility
  // floor, in which case we must keep it collapsed or the zero-width-stroke
  // problem returns.
  let otherGroupKey: NodeKey;
  deletedNodes.forEach((data, key) => {
    if (data.length === 1 && !floorBucketed.has(data[0].key)) {
      if (globalOther) {
        otherGroupKey = SpecialNodeKeys.GlobalOther;
      } else {
        otherGroupKey = key ? key + SpecialNodeKeys.OtherSuffix : 'other';
      }
      addNode(graph, data[0].key, GraphLayers.Category, data[0].data.name);
      const fromNode = graph.get(key);
      const linkValue = fromNode?.to.get(otherGroupKey);
      if (linkValue !== undefined) {
        addValueToLink(graph, key, data[0].key, linkValue);
      }
      deleteLink(graph, key, otherGroupKey);
    }
  });
}

function sortGraph(
  graph: Graph,
  categorySort: SortMode = 'per-group',
  categories: CategoryGroupEntity[],
): Graph {
  let sortedEntries: Array<[string, NodeData]>;
  if (categorySort === 'global') {
    sortedEntries = Array.from(graph.entries()).sort(
      ([keyA], [keyB]) => getNodeValue(graph, keyB) - getNodeValue(graph, keyA),
    );
    // Pin every "Other" bucket at the end of its layer instead of letting
    // value-sort scatter it. Covers SpecialNodeKeys.GlobalOther and any
    // synthesised root bucket (e.g. income_root__OTHER_BUCKET).
    for (const [key] of sortedEntries.slice()) {
      if (key.endsWith(SpecialNodeKeys.OtherSuffix)) {
        moveNodeToEnd(sortedEntries, key);
      }
    }
  } else if (categorySort === 'per-group') {
    const categoryGroups = nodesInLayer(graph, GraphLayers.CategoryGroup);
    sortedEntries = Array.from(graph.entries()).sort(
      ([keyA], [keyB]) => getNodeValue(graph, keyB) - getNodeValue(graph, keyA),
    );

    categoryGroups.forEach(groupKey => {
      const group = graph.get(groupKey);
      if (!group) return;
      const groupToKeys = Array.from(group.to.keys());

      const groupOtherKey = groupToKeys.find(k =>
        k.endsWith(SpecialNodeKeys.OtherSuffix),
      );
      const childKeys = groupToKeys.filter(k => k !== groupOtherKey);

      const childEntries = childKeys
        .map(key => sortedEntries.find(([entryKey]) => entryKey === key))
        .filter((entry): entry is [string, NodeData] => entry !== undefined);
      childEntries.sort(
        ([a], [b]) => getNodeValue(graph, b) - getNodeValue(graph, a),
      );

      const otherEntry = groupOtherKey
        ? sortedEntries.find(([entryKey]) => entryKey === groupOtherKey)
        : undefined;

      // Remove these children ("Other" too) from their current places
      sortedEntries = sortedEntries.filter(
        ([entryKey]) =>
          !childKeys.includes(entryKey) && entryKey !== groupOtherKey,
      );

      // Insert after group node
      const groupIndex = sortedEntries.findIndex(
        ([entryKey]) => entryKey === groupKey,
      );
      if (groupIndex !== -1) {
        sortedEntries.splice(groupIndex + 1, 0, ...childEntries);
        if (otherEntry) {
          sortedEntries.splice(
            groupIndex + 1 + childEntries.length,
            0,
            otherEntry,
          );
        }
      }
    });
  } else {
    const used = new Set<NodeKey>();
    sortedEntries = [];

    // 1. Add entries by category group and subcategory order
    categories.forEach(group => {
      const groupNode = graph.get(group.id);
      if (groupNode) {
        sortedEntries.push([group.id, groupNode]);
        used.add(group.id);
      }

      if (group.categories && group.categories.length) {
        group.categories.forEach(cat => {
          const categoryNode = graph.get(cat.id);
          if (categoryNode) {
            sortedEntries.push([cat.id, categoryNode]);
            used.add(cat.id);
          }
        });
      }

      const otherKey = `${group.id}${SpecialNodeKeys.OtherSuffix}`;
      const otherNode = graph.get(otherKey);
      if (otherNode) {
        sortedEntries.push([otherKey, otherNode]);
        used.add(otherKey);
      }
    });

    // 2. Add all remaining entries that weren't used (preserving graph order)
    for (const [key, data] of graph) {
      if (!used.has(key)) {
        sortedEntries.push([key, data]);
      }
    }
  }

  // We always want these nodes displayed at the bottom of their layers, so its safe to just move them to the end
  moveNodeToEnd(sortedEntries, SpecialNodeKeys.ToBudget);
  moveNodeToEnd(sortedEntries, SpecialNodeKeys.LastMonthOverspent);
  moveNodeToEnd(sortedEntries, SpecialNodeKeys.ForNextMonth);
  moveNodeToEnd(sortedEntries, SpecialNodeKeys.FromPrevMonth);
  return new Map(sortedEntries);
}

function moveNodeToEnd(entries: Array<[string, NodeData]>, key: NodeKey) {
  const nodeIndex = entries.findIndex(([nodekey]) => nodekey === key);
  if (nodeIndex !== -1) {
    const [entry] = entries.splice(nodeIndex, 1);
    entries.push(entry);
  }
}

function getNodeValue(graph: Graph, key: NodeKey): number {
  let nodeValue: number = 0;

  if (getLayer(graph, key) === 0) {
    // Look at outgoing links for root nodes
    const node = graph.get(key);
    if (node) {
      node.to.forEach(value => {
        nodeValue += value ?? 0;
      });
    }
  } else {
    graph.forEach(data => {
      nodeValue += data.to.get(key) ?? 0;
    });

    // If node is in reality a root node, masked behind hidden nodes
    if (nodeValue < 0) {
      nodeValue = 0;
      const node = graph.get(key);
      if (node) {
        node.to.forEach(value => {
          nodeValue += value;
        });
      }
    }
  }
  return nodeValue;
}

function addPercentageLabels(graph: Graph): void {
  const layerSums = new Map<number, number>();

  // First pass: Calculate layer sums
  graph.forEach((_: NodeData, key: NodeKey) => {
    const layer = getLayer(graph, key);
    const nodeValue = getNodeValue(graph, key);
    layerSums.set(layer, (layerSums.get(layer) ?? 0) + nodeValue);
  });

  // Second pass: Assign percentage label to each node
  graph.forEach((data: NodeData, key: NodeKey) => {
    const layer = getLayer(graph, key);
    const nodeValue = getNodeValue(graph, key);
    const layerTotal = layerSums.get(layer) ?? 1;
    const percentage = layerTotal ? (nodeValue / layerTotal) * 100 : 0;
    data.percentageLabel = `${percentage.toFixed(1)}%`;
  });
}

function addColors(graph: Graph) {
  const colors = getColorScale('qualitative');
  const keys = [...graph.keys()].sort();

  keys.forEach((key, i) => {
    const node = graph.get(key);
    if (node) node.color = colors[i % colors.length];
  });

  const node = graph.get(SpecialNodeKeys.ToBudget);
  if (node && node.isOverbudgeted) {
    setColor(graph, SpecialNodeKeys.ToBudget, theme.toBudgetNegative);
  } else {
    setColor(graph, SpecialNodeKeys.ToBudget, theme.toBudgetPositive);
  }
  setColor(graph, SpecialNodeKeys.LastMonthOverspent, theme.toBudgetNegative);
  setColor(graph, SpecialNodeKeys.FromPrevMonth, theme.reportsGray);
  setColor(graph, SpecialNodeKeys.ForNextMonth, theme.reportsGray);
  setColor(graph, SpecialNodeKeys.Budgeted, theme.reportsBlue);
  setColor(graph, SpecialNodeKeys.AvailableIncome, theme.reportsBlue);
}

function setColor(graph: Graph, key: NodeKey, color: string) {
  const node = graph.get(key);
  if (node) {
    node.color = color;
  }
}

function filterGraphByLayers(
  graph: Graph,
  layerFrom: GraphLayers,
  layerTo: GraphLayers,
): void {
  const layerIndices = new Map<string, number>();
  GRAPH_LAYER_ORDER.forEach((layer, index) => {
    layerIndices.set(layer, index);
  });

  const fromIndex = layerIndices.get(layerFrom);
  const toIndex = layerIndices.get(layerTo);

  if (fromIndex !== undefined && toIndex !== undefined) {
    const keysToDelete: NodeKey[] = [];
    graph.forEach((data, key) => {
      const nodeLayerIndex = layerIndices.get(data.type);
      if (nodeLayerIndex !== undefined) {
        if (nodeLayerIndex < fromIndex || nodeLayerIndex > toIndex) {
          keysToDelete.push(key);
        }
      }
    });

    const deletedKeys = new Set(keysToDelete);
    keysToDelete.forEach(key => graph.delete(key));
    // Prune dangling outgoing links that pointed at deleted nodes — otherwise
    // convertToSankeyData would emit links with target index -1. Use the same
    // collect-then-delete pattern as the node sweep above so the iterator is
    // never mutated mid-walk.
    graph.forEach(data => {
      const targetsToDelete: NodeKey[] = [];
      for (const target of data.to.keys()) {
        if (deletedKeys.has(target)) targetsToDelete.push(target);
      }
      targetsToDelete.forEach(t => data.to.delete(t));
    });
  }
}

function cleanUpNodes(graph: Graph) {
  // 1. Remove all `.to` links with value === 0
  for (const [, node] of graph) {
    for (const [target, value] of node.to) {
      if (value === 0) {
        node.to.delete(target);
      }
    }
  }

  // 2. Find all nodes that are targets of remaining links ("has incoming link")
  const hasIncoming = new Set<NodeKey>();
  for (const [, node] of graph) {
    for (const target of node.to.keys()) {
      hasIncoming.add(target);
    }
  }

  // 3. Collect keys to remove (no incoming links and no outgoing links)
  const toDelete: NodeKey[] = [];
  for (const [key, node] of graph) {
    const hasOutgoing = node.to.size > 0;
    const incoming = hasIncoming.has(key);
    if (!hasOutgoing && !incoming) {
      toDelete.push(key);
    }
  }

  // 4. Remove these nodes from the graph
  for (const key of toDelete) {
    graph.delete(key);
  }
}

function convertToSankeyData(graph: Graph): SankeyData {
  const nodes = Array.from(graph, ([key, data]) => ({
    key,
    name: data.labelKey
      ? t(data.labelKey, data.labelParams)
      : (data.name ?? key),
    percentageLabel: data.percentageLabel ?? '',
    color: data.color ?? undefined,
  }));
  const links = Array.from(graph).flatMap(([key, data]) =>
    Array.from(data.to, ([targetKey, value]) => {
      let tooltipInfo: Array<{ name: string; value: number }> = [];
      if (data.tooltipInfo && targetKey.endsWith(SpecialNodeKeys.OtherSuffix)) {
        tooltipInfo = data.tooltipInfo;
        tooltipInfo.sort((a, b) => b.value - a.value);
      }

      let color: string | undefined;
      const sourceLayersWithOwnColor: readonly GraphLayers[] = [
        GraphLayers.IncomePayee,
        GraphLayers.IncomeCategory,
        GraphLayers.Account,
        GraphLayers.CategoryGroup,
      ];
      const targetLayersWithTargetColor: readonly GraphLayers[] = [
        GraphLayers.Category,
        GraphLayers.Budget,
      ];

      if (
        isGraphLayer(data.type) &&
        sourceLayersWithOwnColor.includes(data.type)
      ) {
        color = data.color;
      } else if (
        isGraphLayer(data.type) &&
        targetLayersWithTargetColor.includes(data.type)
      ) {
        const targetNode = graph.get(targetKey);
        color = targetNode ? targetNode.color : undefined;
      }

      // Specific color overrides
      if (targetKey === SpecialNodeKeys.LastMonthOverspent) {
        color = graph.get(SpecialNodeKeys.LastMonthOverspent)?.color;
      }
      if (targetKey === SpecialNodeKeys.ToBudget) {
        color = graph.get(SpecialNodeKeys.ToBudget)?.color;
      }
      if (targetKey === SpecialNodeKeys.ForNextMonth) {
        color = graph.get(SpecialNodeKeys.ForNextMonth)?.color;
      }
      if (
        targetKey === SpecialNodeKeys.AvailableIncome &&
        data.isOverbudgeted
      ) {
        color = data.color;
      }

      return {
        source: nodes.findIndex(n => n.key === key) ?? -1,
        target: nodes.findIndex(n => n.key === targetKey) ?? -1,
        value,
        tooltipInfo,
        color: color ?? undefined,
      };
    }),
  );

  return {
    nodes,
    links,
  };
}
