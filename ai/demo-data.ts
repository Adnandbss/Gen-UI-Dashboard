import type {
  GeneratedUiFilter,
  KpiSet,
  MonthsFilter,
  RevenueChartFilter,
  RunwayFilter,
  TransactionsListFilter,
} from "./schemas";
import { CASH_AREA_CODE, SEGMENT_PIE_CODE } from "./generated-templates";

/**
 * Keyword router for demo mode. It only decides *which filters to request*;
 * `execute` still loads numbers from the warehouse so demo and live cannot drift.
 */

export type DemoToolCall =
  | { toolName: "show_revenue_chart"; input: RevenueChartFilter }
  | { toolName: "show_transactions_list"; input: TransactionsListFilter }
  | { toolName: "show_kpi_metrics"; input: { kpiSet: KpiSet } }
  | { toolName: "show_runway"; input: RunwayFilter }
  | { toolName: "show_generated_ui"; input: GeneratedUiFilter };

export type DemoPlan = {
  intro: string;
  toolCalls: DemoToolCall[];
  closing: string;
};

const matches = (text: string, pattern: RegExp) => pattern.test(text);

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
  !matches(text, /show|give|render|display|pull up|chart|dashboard|list|break down|explain/);

export function parseMonths(text: string): MonthsFilter {
  if (/last 12 months|trailing 12|past year|12 months/.test(text)) return 12;
  if (/last 3 months|trailing 3|past quarter|3 months/.test(text)) return 3;
  return 6;
}

function parseTxnId(text: string) {
  return text.match(/txn-[\w-]+/i)?.[0]?.toUpperCase();
}

/**
 * Picks which widgets to render from the user's message. This is intentionally a
 * dumb keyword router — it exists so the UI can be explored without credentials,
 * not to imitate a language model.
 */
export function planDemoResponse(userText: string): DemoPlan {
  const text = userText.toLowerCase();
  const months = parseMonths(text);

  if (matches(text, /settings|configure|workspace/)) {
    return {
      intro:
        "This is a demo workspace — there are no live integrations to configure. Ask for a dashboard, a revenue trend, or recent transactions and I will render them as UI.",
      toolCalls: [],
      closing: "",
    };
  }

  if (isConceptual(text)) {
    const entry = GLOSSARY.find((g) => g.pattern.test(text));
    if (entry) {
      return { intro: entry.answer, toolCalls: [], closing: "" };
    }
  }

  const txnId = parseTxnId(text);
  if (txnId && matches(text, /explain|transaction/)) {
    return {
      intro: `Looking up ${txnId}.`,
      toolCalls: [
        {
          toolName: "show_transactions_list",
          input: { status: "all", id: txnId },
        },
      ],
      closing:
        "This is the named ledger line — click another row if you want the same treatment for a different payment.",
    };
  }

  if (matches(text, /generated component failed/)) {
    const monthly = matches(text, /monthly_pl/);
    return {
      intro: "Retrying the custom view.",
      toolCalls: [
        monthly
          ? {
              toolName: "show_generated_ui",
              input: {
                dataset: "monthly_pl",
                months: 6,
                code: CASH_AREA_CODE,
              },
            }
          : {
              toolName: "show_generated_ui",
              input: {
                dataset: "transactions",
                code: SEGMENT_PIE_CODE,
              },
            },
      ],
      closing: "Layout is rebuilt from the same warehouse rows.",
    };
  }

  if (matches(text, /\bcountr(?:y|ies)\b|\bcohorts?\b|\bweekly\b/)) {
    return {
      intro:
        "We don't have country, cohort, or weekly cuts — only month, segment, and status. Ask for inflows by segment or cash over time and I can draw those from the ledger.",
      toolCalls: [],
      closing: "",
    };
  }

  if (matches(text, /by segment|inflows by segment/) && !matches(text, /churn/)) {
    return {
      intro: "Grouping ledger inflows by segment.",
      toolCalls: [
        {
          toolName: "show_generated_ui",
          input: {
            dataset: "transactions",
            code: SEGMENT_PIE_CODE,
          },
        },
      ],
      closing:
        "Enterprise and Manufacturing are the large completed inflows; Ops and People are outflows, so they do not appear as pie slices.",
    };
  }

  if (
    matches(text, /cash over time|cash over the last|ending cash over|cash as an area/) &&
    !matches(text, /runway/)
  ) {
    return {
      intro: "Plotting ending cash from the monthly P&L.",
      toolCalls: [
        {
          toolName: "show_generated_ui",
          input: {
            dataset: "monthly_pl",
            months,
            code: CASH_AREA_CODE,
          },
        },
      ],
      closing:
        "Cash is still declining, but the slope flattened in August as net burn came in lower.",
    };
  }

  if (matches(text, /break down/)) {
    if (matches(text, /churn|retention|at-risk/)) {
      return {
        intro: "Pulling the churn scorecard.",
        toolCalls: [{ toolName: "show_kpi_metrics", input: { kpiSet: "churn" } }],
        closing:
          "Logo churn is improving, but the three at-risk enterprise accounts are the real story.",
      };
    }
    if (matches(text, /burn|runway/)) {
      return {
        intro: "Breaking down burn and runway.",
        toolCalls: [
          { toolName: "show_kpi_metrics", input: { kpiSet: "burn" } },
          { toolName: "show_runway", input: { months } },
        ],
        closing:
          "Net burn dropped in August, which is what stretched runway — not a one-off cash injection.",
      };
    }
    return {
      intro: "Breaking that metric into the trend underneath it.",
      toolCalls: [{ toolName: "show_revenue_chart", input: { months } }],
      closing:
        "August is the high-water mark; the gap versus expenses is operating leverage, not a one-off invoice.",
    };
  }

  if (matches(text, /churn/)) {
    return {
      intro: "Pulling segment churn now.",
      toolCalls: [{ toolName: "show_kpi_metrics", input: { kpiSet: "churn" } }],
      closing:
        "Logo churn is improving, but the three at-risk enterprise accounts are the real story — if even one of them slips, August NRR drops back through 110%. Expansion in mid-market is what is currently covering it.",
    };
  }

  const wantsRunway = matches(text, /runway|cash on hand|months of cash/);
  const wantsBurnDeepDive = matches(text, /burn multiple|net burn/);
  const wantsEverything = matches(
    text,
    /dashboard|everything|full picture|overview of everything|brief me|board pack/,
  );
  const wantsKpis =
    wantsEverything ||
    wantsBurnDeepDive ||
    matches(text, /kpi|metric|summar|overview|how are we|health|snapshot|performance/);
  const wantsChart =
    wantsEverything ||
    wantsBurnDeepDive ||
    matches(text, /revenue|expense|chart|trend|growth|burn|margin|month|compare|quarter|walk me through/);
  const wantsTransactions =
    wantsEverything ||
    matches(text, /transaction|payment|spend|ledger|recent|activity|pending|invoice|charge/);

  const pendingOnly = matches(text, /pending|outstanding|unsettled|awaiting/);

  const toolCalls: DemoToolCall[] = [];
  if (wantsKpis) {
    toolCalls.push({
      toolName: "show_kpi_metrics",
      input: {
        kpiSet: wantsBurnDeepDive && !wantsEverything ? "burn" : "overview",
      },
    });
  }
  if (wantsRunway) {
    toolCalls.push({ toolName: "show_runway", input: { months } });
  }
  if (wantsChart && !wantsRunway) {
    toolCalls.push({ toolName: "show_revenue_chart", input: { months } });
  }
  if (wantsChart && wantsRunway && wantsBurnDeepDive) {
    toolCalls.push({ toolName: "show_revenue_chart", input: { months } });
  }
  if (wantsTransactions) {
    toolCalls.push({
      toolName: "show_transactions_list",
      input: { status: pendingOnly ? "Pending" : "all" },
    });
  }

  if (toolCalls.length === 0) {
    toolCalls.push(
      { toolName: "show_kpi_metrics", input: { kpiSet: "overview" } },
      { toolName: "show_revenue_chart", input: { months } },
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
  if (rendered.has("show_runway")) {
    notes.push(
      "Cash is still declining, but slower — August burn is what stretched runway, not a financing event.",
    );
  }
  if (rendered.has("show_generated_ui")) {
    notes.push(
      "This view is warehouse rows running in an isolated layout — if a cut is missing, it is because we do not have that field.",
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
