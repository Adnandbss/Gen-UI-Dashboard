import { z } from "zod";

/**
 * The contract between the model and the UI.
 *
 * Every widget derives its props from the schema its tool validates against, so
 * a tool and its component can never drift apart: change the schema and both the
 * server-side validation and the client-side prop types move with it.
 *
 * This file deliberately imports nothing from `ai` so it stays safe to pull into
 * client components.
 */

/* -------------------------------------------------------------------------- */
/*  show_revenue_chart                                                        */
/* -------------------------------------------------------------------------- */

export const revenueDatumSchema = z.object({
  month: z
    .string()
    .describe('Short month label shown on the x-axis, e.g. "Jan" or "Jan 26".'),
  revenue: z
    .number()
    .describe("Gross revenue for that month, in whole currency units."),
  expenses: z
    .number()
    .describe("Total expenses for that month, in whole currency units."),
});

export const revenueChartSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Card heading, e.g. "Revenue vs. Expenses". Defaults if omitted.'),
  subtitle: z
    .string()
    .optional()
    .describe('Short qualifier under the heading, e.g. "Last 6 months".'),
  data: z
    .array(revenueDatumSchema)
    .min(1)
    .max(24)
    .describe("One entry per period, ordered oldest to newest."),
});

/* -------------------------------------------------------------------------- */
/*  show_transactions_list                                                    */
/* -------------------------------------------------------------------------- */

export const transactionStatusSchema = z.enum(["Completed", "Pending"]);

export const transactionSchema = z.object({
  id: z
    .string()
    .describe('Stable identifier shown to the user, e.g. "TXN-4021".'),
  date: z.string().describe("ISO-8601 date, e.g. 2026-08-14."),
  description: z.string().describe("Merchant, counterparty, or memo line."),
  amount: z
    .number()
    .describe(
      "Signed amount: positive for money received, negative for money spent.",
    ),
  status: transactionStatusSchema.describe("Settlement state."),
});

export const transactionsListSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Card heading, e.g. "Recent Transactions". Defaults if omitted.'),
  transactions: z
    .array(transactionSchema)
    .min(1)
    .max(50)
    .describe("Transactions ordered newest first."),
});

/* -------------------------------------------------------------------------- */
/*  show_kpi_metrics                                                          */
/* -------------------------------------------------------------------------- */

export const metricSchema = z.object({
  title: z.string().describe('Metric name, e.g. "Net Revenue".'),
  value: z
    .string()
    .describe(
      'Preformatted headline value including any symbol or unit, e.g. "$128,400" or "4.8%".',
    ),
  trend: z
    .string()
    .describe(
      'Change versus the comparison period, e.g. "+12.4% vs. last month".',
    ),
  isPositive: z
    .boolean()
    .describe("Whether the trend is good news for the business."),
});

export const kpiMetricsSchema = z.object({
  metrics: z
    .array(metricSchema)
    .min(1)
    .max(6)
    .describe("Return exactly 3 metrics unless the user asks for a different set."),
});

/* -------------------------------------------------------------------------- */
/*  Inferred types — the single source of truth for widget props              */
/* -------------------------------------------------------------------------- */

export type RevenueDatum = z.infer<typeof revenueDatumSchema>;
export type RevenueChartInput = z.infer<typeof revenueChartSchema>;

export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionsListInput = z.infer<typeof transactionsListSchema>;

export type Metric = z.infer<typeof metricSchema>;
export type KpiMetricsInput = z.infer<typeof kpiMetricsSchema>;
