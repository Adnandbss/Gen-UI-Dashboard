import { tool } from "ai";

import {
  kpiMetricsSchema,
  revenueChartSchema,
  transactionsListSchema,
} from "./schemas";

/**
 * The three tools the model may call. Each one is a pure rendering instruction:
 * the model supplies the payload, the client renders the matching widget from
 * the tool *input*.
 *
 * `execute` therefore returns only a short acknowledgement rather than echoing
 * the payload back. The widget already has everything it needs from the input,
 * and feeding a full dataset back into the context window on every step would
 * roughly double token cost for no gain.
 */
export const chatTools = {
  show_revenue_chart: tool({
    description:
      "Render a grouped bar chart comparing revenue against expenses over time. Use for trends, growth, burn, and period-over-period comparisons.",
    inputSchema: revenueChartSchema,
    execute: async ({ data }) => ({
      status: "rendered" as const,
      summary: `Revenue chart rendered for ${data.length} period(s), ${data[0]?.month} through ${data[data.length - 1]?.month}.`,
    }),
  }),

  show_transactions_list: tool({
    description:
      "Render a table of individual transactions. Use for recent activity, pending payments, spend breakdowns, and ledger-level questions.",
    inputSchema: transactionsListSchema,
    execute: async ({ transactions }) => ({
      status: "rendered" as const,
      summary: `Transactions table rendered with ${transactions.length} row(s).`,
    }),
  }),

  show_kpi_metrics: tool({
    description:
      "Render a row of headline KPI cards. Use for high-level summaries, health checks, and 'how are we doing' questions.",
    inputSchema: kpiMetricsSchema,
    execute: async ({ metrics }) => ({
      status: "rendered" as const,
      summary: `KPI scorecard rendered with ${metrics.length} metric(s).`,
    }),
  }),
};

export type ChatToolName = keyof typeof chatTools;
