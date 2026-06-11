// FINANCE FORK: canonical income/expense filter shared by every flow query.
export type FlowKind = 'income' | 'expense';

type FlowFilter = {
  $and: Array<Record<string, unknown>>;
};

export function buildFlowFilter(
  start: string,
  end: string,
  kind: FlowKind,
): FlowFilter {
  return {
    $and: [
      { date: { $gte: start } },
      { date: { $lte: end } },
      { amount: { [kind === 'income' ? '$gt' : '$lt']: 0 } },
      { 'account.offbudget': false },
      { 'payee.transfer_acct': null },
      { 'category.is_income': kind === 'income' },
    ],
  };
}
