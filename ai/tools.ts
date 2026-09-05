import { tool, type ToolSet } from "ai";

import {
  generatedUiFilterSchema,
  kpiMetricsFilterSchema,
  revenueChartFilterSchema,
  runwayFilterSchema,
  transactionsListFilterSchema,
} from "./schemas";
import {
  getKpis,
  getRevenueSeries,
  getRunway,
  getTransactions,
  renderGeneratedUi,
} from "@/lib/warehouse/queries";

export type ChatToolOptions = {
  chatId?: string;
  knowledgeMode?: boolean;
};

function generatedUiTool(options?: ChatToolOptions) {
  return tool({
    description: options?.knowledgeMode
      ? "Render a custom React view from the user's uploaded table. Pass dataset as the source id (ks_...). Rows are loaded in execute and injected as the data prop — never put numbers or fetch in code."
      : "Render a custom React view in an isolated sandbox for charts the specialist tools do not cover (pie by segment, cash as an area, counts by status, one-off layouts). Pass dataset plus raw component source in `code`. Rows are loaded from the warehouse and injected as the `data` prop — never put numbers or fetch in `code`. Prefer a specialist tool when it matches. If the warehouse has no such cut (country, cohort, weekly), do not call this tool.",
    inputSchema: generatedUiFilterSchema,
    execute: async (spec) => renderGeneratedUi(spec, options),
  });
}

/**
 * Query in, view out. The model only chooses filters; `execute` loads the
 * current widget props from the warehouse so demo mode and a live model cannot
 * drift onto different numbers.
 *
 * When a thread has uploaded tables (`knowledgeMode`), the four Acme specialist
 * tools are omitted so this chat cannot mix warehouse KPIs with the user's file.
 */
export const chatTools = {
  show_revenue_chart: tool({
    description:
      "Render a grouped bar chart comparing revenue against expenses over time. Use for trends, growth, burn, and period-over-period comparisons. Pass months: 3, 6, or 12.",
    inputSchema: revenueChartFilterSchema,
    execute: async ({ months }) => getRevenueSeries({ months }),
  }),

  show_transactions_list: tool({
    description:
      "Render a table of individual transactions. Use for recent activity, pending payments, spend breakdowns, and ledger-level questions. Filter with status all | Completed | Pending, or a specific id.",
    inputSchema: transactionsListFilterSchema,
    execute: async ({ status, id }) => getTransactions({ status, id }),
  }),

  show_kpi_metrics: tool({
    description:
      "Render a row of headline KPI cards. Use overview for health checks, burn for burn multiple / net burn / runway, churn for logo churn / NRR / at-risk ARR.",
    inputSchema: kpiMetricsFilterSchema,
    execute: async ({ kpiSet }) => getKpis({ set: kpiSet }),
  }),

  show_runway: tool({
    description:
      "Render a cash runway chart (ending cash over time plus months-of-runway callout). Use when the user asks about runway, cash on hand, or how long the business can operate at current burn.",
    inputSchema: runwayFilterSchema,
    execute: async ({ months }) => getRunway({ months }),
  }),

  show_generated_ui: generatedUiTool(),
};

export function createChatTools(options?: ChatToolOptions): ToolSet {
  const show_generated_ui = generatedUiTool(options);
  if (options?.knowledgeMode) {
    return { show_generated_ui };
  }
  return { ...chatTools, show_generated_ui };
}

export type ChatToolName = keyof typeof chatTools;
