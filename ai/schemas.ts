import { z } from "zod";

/**
 * The contract between the warehouse, the model, and the UI.
 *
 * Tools take *filters* (query in). `execute` loads a typed view model from the
 * warehouse (view out). Widgets parse `part.output` against the view schemas
 * below, so a query and its component cannot drift apart.
 *
 * This file deliberately imports nothing from `ai` so it stays safe to pull into
 * client components.
 */

export const monthsFilterSchema = z
  .union([z.literal(3), z.literal(6), z.literal(12)])
  .default(6)
  .describe("How many trailing months to include. Defaults to 6.");

export const revenueChartFilterSchema = z.object({
  months: monthsFilterSchema,
});

export const transactionStatusFilterSchema = z
  .enum(["all", "Completed", "Pending"])
  .default("all")
  .describe("Settlement filter. Use Pending for unsettled items.");

export const transactionsListFilterSchema = z.object({
  status: transactionStatusFilterSchema,
  id: z
    .string()
    .optional()
    .describe("When set, return only this transaction id (e.g. TXN-4092)."),
});

export const kpiSetSchema = z
  .enum(["overview", "burn", "churn"])
  .default("overview")
  .describe(
    "overview = headline scorecard, burn = burn multiple / net burn / runway, churn = logo churn / NRR / at-risk ARR.",
  );

export const kpiMetricsFilterSchema = z.object({
  kpiSet: kpiSetSchema,
});

export const runwayFilterSchema = z.object({
  months: monthsFilterSchema,
});

/* -------------------------------------------------------------------------- */
/*  View models — what execute returns and widgets render                     */
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
    .max(50)
    .describe("Transactions ordered newest first."),
});

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

export const runwayDatumSchema = z.object({
  month: z.string().describe("Short month label on the x-axis."),
  cash: z.number().describe("Ending cash for that month."),
  runwayMonths: z
    .number()
    .describe("Implied months of runway at that month's trailing burn."),
});

export const runwaySchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  monthsOfRunway: z
    .number()
    .describe("Current months of runway from the latest cash / trailing burn."),
  cashOnHand: z.number().describe("Latest ending cash balance."),
  netBurn: z.number().describe("Latest monthly net burn used for the callout."),
  data: z
    .array(runwayDatumSchema)
    .min(1)
    .max(24)
    .describe("Cash series, oldest to newest."),
});

export type MonthsFilter = 3 | 6 | 12;
export type RevenueChartFilter = z.infer<typeof revenueChartFilterSchema>;
export type TransactionsListFilter = z.infer<typeof transactionsListFilterSchema>;
export type KpiMetricsFilter = z.infer<typeof kpiMetricsFilterSchema>;
export type RunwayFilter = z.infer<typeof runwayFilterSchema>;
export type KpiSet = z.infer<typeof kpiSetSchema>;

export type RevenueDatum = z.infer<typeof revenueDatumSchema>;
export type RevenueChartInput = z.infer<typeof revenueChartSchema>;

export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionsListInput = z.infer<typeof transactionsListSchema>;

export type Metric = z.infer<typeof metricSchema>;
export type KpiMetricsInput = z.infer<typeof kpiMetricsSchema>;

export type RunwayDatum = z.infer<typeof runwayDatumSchema>;
export type RunwayInput = z.infer<typeof runwaySchema>;
