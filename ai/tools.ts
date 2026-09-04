import { tool } from "ai";

import {
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
} from "@/lib/warehouse/queries";

/**
 * Query in, view out. The model only chooses filters; `execute` loads the
 * current widget props from the warehouse so demo mode and a live model cannot
 * drift onto different numbers.
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
};

export type ChatToolName = keyof typeof chatTools;
