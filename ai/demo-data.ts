import type {
  KpiMetricsInput,
  RevenueChartInput,
  TransactionsListInput,
} from "./schemas";
import type { ChatToolName } from "./tools";

/**
 * Scripted responses for demo mode (no API key configured).
 *
 * The figures below describe one coherent fictional SaaS business so that every
 * widget agrees with every other widget — the chart totals, the KPI deltas, and
 * the ledger all reconcile.
 */

const REVENUE: RevenueChartInput = {
  title: "Revenue vs. Expenses",
  subtitle: "Trailing 6 months",
  data: [
    { month: "Mar", revenue: 412_000, expenses: 318_000 },
    { month: "Apr", revenue: 438_000, expenses: 331_000 },
    { month: "May", revenue: 421_000, expenses: 342_000 },
    { month: "Jun", revenue: 476_000, expenses: 349_000 },
    { month: "Jul", revenue: 519_000, expenses: 358_000 },
    { month: "Aug", revenue: 548_000, expenses: 366_000 },
  ],
};

const KPIS: KpiMetricsInput = {
  metrics: [
    {
      title: "Net Revenue",
      value: "$548,000",
      trend: "+5.6% vs. July",
      isPositive: true,
    },
    {
      title: "Gross Margin",
      value: "66.2%",
      trend: "+1.8 pts vs. Q2 average",
      isPositive: true,
    },
    {
      title: "Burn Multiple",
      value: "0.94x",
      trend: "-0.12x vs. July",
      isPositive: true,
    },
  ],
};

const ALL_TRANSACTIONS: TransactionsListInput = {
  title: "Recent Transactions",
  transactions: [
    {
      id: "TXN-4092",
      date: "2026-08-29",
      description: "Northwind Logistics — Annual license",
      amount: 84_000,
      status: "Completed",
    },
    {
      id: "TXN-4088",
      date: "2026-08-27",
      description: "AWS — Compute & storage",
      amount: -31_450.75,
      status: "Completed",
    },
    {
      id: "TXN-4081",
      date: "2026-08-24",
      description: "Meridian Health — Platform expansion",
      amount: 47_500,
      status: "Pending",
    },
    {
      id: "TXN-4076",
      date: "2026-08-21",
      description: "Payroll — August cycle",
      amount: -186_200,
      status: "Completed",
    },
    {
      id: "TXN-4070",
      date: "2026-08-18",
      description: "Atlas Retail Group — Seat true-up",
      amount: 22_800,
      status: "Completed",
    },
    {
      id: "TXN-4063",
      date: "2026-08-15",
      description: "Quarterly SOC 2 audit — Vantage LLP",
      amount: -18_000,
      status: "Pending",
    },
    {
      id: "TXN-4059",
      date: "2026-08-12",
      description: "Helios Manufacturing — Renewal",
      amount: 61_250,
      status: "Completed",
    },
  ],
};

export type DemoToolCall = {
  toolName: ChatToolName;
  input: unknown;
};

export type DemoPlan = {
  intro: string;
  toolCalls: DemoToolCall[];
  closing: string;
};

const matches = (text: string, pattern: RegExp) => pattern.test(text);

/**
 * Conceptual questions deserve a sentence, not a chart. Without this the
 * keyword router would see "burn" in "what is a burn multiple?" and render the
 * revenue chart at someone asking for a definition.
 */
const GLOSSARY: { pattern: RegExp; answer: string }[] = [
  {
    pattern: /burn multiple/,
    answer:
      "Burn multiple is net burn divided by net new ARR — how many dollars you consume to add a dollar of recurring revenue. Below 1.0x is efficient growth; above 2.0x usually means the growth is being bought rather than earned.",
  },
  {
    pattern: /gross margin/,
    answer:
      "Gross margin is revenue minus cost of revenue, as a percentage of revenue. For SaaS it mostly reflects hosting and support costs, and healthy businesses generally sit between 70% and 85%.",
  },
  {
    pattern: /net revenue|arr|mrr/,
    answer:
      "Net revenue is gross revenue less refunds, credits and discounts — the figure that actually lands in the business. ARR and MRR annualise or monthly-ise that same recurring base.",
  },
];

const isConceptual = (text: string) =>
  matches(text, /^\s*(what|what's|whats|why|how)\b/) &&
  !matches(text, /show|give|render|display|pull up|chart|dashboard|list/);

/**
 * Picks which widgets to render from the user's message. This is intentionally a
 * dumb keyword router — it exists so the UI can be explored without credentials,
 * not to imitate a language model.
 */
export function planDemoResponse(userText: string): DemoPlan {
  const text = userText.toLowerCase();

  if (isConceptual(text)) {
    const entry = GLOSSARY.find((g) => g.pattern.test(text));
    if (entry) {
      return { intro: entry.answer, toolCalls: [], closing: "" };
    }
  }

  const wantsEverything = matches(
    text,
    /dashboard|everything|full picture|overview of everything|brief me|walk me through/,
  );
  const wantsKpis =
    wantsEverything ||
    matches(text, /kpi|metric|summar|overview|how are we|health|snapshot|performance/);
  const wantsChart =
    wantsEverything ||
    matches(text, /revenue|expense|chart|trend|growth|burn|margin|month|compare|quarter/);
  const wantsTransactions =
    wantsEverything ||
    matches(text, /transaction|payment|spend|ledger|recent|activity|pending|invoice|charge/);

  const pendingOnly = matches(text, /pending|outstanding|unsettled|awaiting/);

  const transactions: TransactionsListInput = pendingOnly
    ? {
        title: "Pending Transactions",
        transactions: ALL_TRANSACTIONS.transactions.filter(
          (t) => t.status === "Pending",
        ),
      }
    : ALL_TRANSACTIONS;

  const toolCalls: DemoToolCall[] = [];
  if (wantsKpis) toolCalls.push({ toolName: "show_kpi_metrics", input: KPIS });
  if (wantsChart)
    toolCalls.push({ toolName: "show_revenue_chart", input: REVENUE });
  if (wantsTransactions)
    toolCalls.push({ toolName: "show_transactions_list", input: transactions });

  // Nothing matched: show the headline scorecard and the trend, which answers
  // most open-ended questions about the business.
  if (toolCalls.length === 0) {
    toolCalls.push(
      { toolName: "show_kpi_metrics", input: KPIS },
      { toolName: "show_revenue_chart", input: REVENUE },
    );
  }

  return {
    intro: "Pulling that together now.",
    toolCalls,
    closing: buildClosing(toolCalls, pendingOnly),
  };
}

function buildClosing(toolCalls: DemoToolCall[], pendingOnly: boolean): string {
  const rendered = new Set(toolCalls.map((call) => call.toolName));
  const notes: string[] = [];

  if (rendered.has("show_kpi_metrics")) {
    notes.push(
      "August was the third consecutive month of expansion, and the burn multiple dipping below 1.0x means growth is now costing less than a dollar per dollar added.",
    );
  }
  if (rendered.has("show_revenue_chart")) {
    notes.push(
      "Revenue is up 33% since March while expenses grew only 15%, so the widening gap is operating leverage rather than one-off timing.",
    );
  }
  if (rendered.has("show_transactions_list")) {
    notes.push(
      pendingOnly
        ? "Meridian Health is the one to chase — it is the largest unsettled line and it slips August recognised revenue if it lands late."
        : "Payroll remains the dominant outflow; the Meridian Health expansion is still pending and worth watching.",
    );
  }

  return notes.join(" ");
}
