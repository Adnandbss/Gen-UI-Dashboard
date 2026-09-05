import { desc, eq } from "drizzle-orm";

import type {
  GeneratedUiFilter,
  GeneratedUiOutput,
  KpiMetricsInput,
  KpiSet,
  MonthsFilter,
  RevenueChartInput,
  RunwayInput,
  TransactionStatus,
  TransactionsListInput,
  VisualFilter,
  VisualOutput,
} from "@/ai/schemas";
import { sanitizeGeneratedCode } from "@/lib/generated-ui/sanitize";
import { getKnowledgeSource } from "@/lib/knowledge/store";
import { kpis, monthlyPl, transactions } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import {
  KPIS,
  MONTHLY_PL,
  TRANSACTIONS,
  type MonthlyPlRow,
  type TransactionRow,
} from "@/lib/warehouse/seed-data";

function trailing<T>(rows: T[], months: MonthsFilter): T[] {
  return rows.slice(-months);
}

function periodSubtitle(months: MonthsFilter) {
  return months === 12 ? "Trailing 12 months" : `Trailing ${months} months`;
}

function runwayPoints(rows: MonthlyPlRow[]) {
  return rows.map((row) => ({
    month: row.label,
    cash: row.cash,
    runwayMonths:
      row.netBurn <= 0 ? 36 : Math.round((row.cash / row.netBurn) * 10) / 10,
  }));
}

function revenueView(rows: MonthlyPlRow[], months: MonthsFilter): RevenueChartInput {
  return {
    title: "Revenue vs. Expenses",
    subtitle: periodSubtitle(months),
    data: rows.map((row) => ({
      month: row.label,
      revenue: row.revenue,
      expenses: row.expenses,
    })),
  };
}

function transactionView(
  rows: TransactionRow[],
  status: "all" | TransactionStatus,
): TransactionsListInput {
  return {
    title: status === "Pending" ? "Pending Transactions" : "Recent Transactions",
    transactions: rows.map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      status: row.status,
    })),
  };
}

function kpiView(set: KpiSet): KpiMetricsInput {
  return {
    metrics: KPIS.filter((row) => row.kpiSet === set)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ title, value, trend, isPositive }) => ({
        title,
        value,
        trend,
        isPositive,
      })),
  };
}

function runwayView(rows: MonthlyPlRow[], months: MonthsFilter): RunwayInput {
  const data = runwayPoints(rows);
  const latest = rows[rows.length - 1];
  const latestPoint = data[data.length - 1];
  return {
    title: "Cash runway",
    subtitle: periodSubtitle(months),
    monthsOfRunway: latestPoint?.runwayMonths ?? 0,
    cashOnHand: latest?.cash ?? 0,
    netBurn: latest?.netBurn ?? 0,
    data,
  };
}

async function loadMonthly(): Promise<MonthlyPlRow[]> {
  if (!hasDatabase()) return MONTHLY_PL;
  return getDb().select().from(monthlyPl).orderBy(monthlyPl.month);
}

async function loadLedger(): Promise<TransactionRow[]> {
  if (!hasDatabase()) return TRANSACTIONS;
  const rows = await getDb()
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date));
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    status: row.status as TransactionStatus,
    segment: row.segment,
  }));
}

export async function getRevenueSeries(options?: {
  months?: MonthsFilter;
}): Promise<RevenueChartInput> {
  const months = options?.months ?? 6;
  const rows = await loadMonthly();
  return revenueView(trailing(rows, months), months);
}

export async function getTransactions(options?: {
  status?: "all" | TransactionStatus;
  id?: string;
}): Promise<TransactionsListInput> {
  const status = options?.status ?? "all";
  const id = options?.id?.toUpperCase();
  let rows = await loadLedger();
  if (id) rows = rows.filter((row) => row.id.toUpperCase() === id);
  else if (status !== "all") rows = rows.filter((row) => row.status === status);
  return transactionView(rows, status);
}

export async function getKpis(options?: { set?: KpiSet }): Promise<KpiMetricsInput> {
  const set = options?.set ?? "overview";

  if (!hasDatabase()) {
    return kpiView(set);
  }

  const rows = await getDb()
    .select()
    .from(kpis)
    .where(eq(kpis.kpiSet, set))
    .orderBy(kpis.sortOrder);

  if (rows.length === 0) return kpiView(set);

  return {
    metrics: rows.map((row) => ({
      title: row.title,
      value: row.value,
      trend: row.trend,
      isPositive: row.isPositive,
    })),
  };
}

export async function getRunway(options?: {
  months?: MonthsFilter;
}): Promise<RunwayInput> {
  const months = options?.months ?? 6;
  const rows = await loadMonthly();
  return runwayView(trailing(rows, months), months);
}

const MONTHLY_X = new Set(["label", "month"]);
const MONTHLY_Y = new Set(["revenue", "expenses", "cash", "netBurn"]);
const TXN_X = new Set(["segment", "status"]);
const TXN_Y = new Set(["amount", "id"]);
const TXN_SERIES = new Set(["segment", "status"]);

const FIELD_LABELS: Record<string, string> = {
  label: "Month",
  month: "Month",
  revenue: "Revenue",
  expenses: "Expenses",
  cash: "Cash",
  netBurn: "Net burn",
  segment: "Segment",
  status: "Status",
  amount: "Amount",
  id: "Count",
};

function prettyField(field: string) {
  return FIELD_LABELS[field] ?? field;
}

function fail(reason: string): VisualOutput {
  return { unsupported: true, reason };
}

function resolveMark(
  mark: VisualFilter["mark"],
  seriesKey: string | undefined,
): VisualFilter["mark"] {
  if (mark === "grouped_bar" && !seriesKey) return "bar";
  return mark;
}

function defaultVisualTitle(spec: VisualFilter, seriesKey?: string) {
  if (spec.title) return spec.title;
  const measure = prettyField(spec.y);
  const dimension = prettyField(spec.x === "month" ? "label" : spec.x);
  if (seriesKey) return `${measure} by ${dimension} and ${prettyField(seriesKey)}`;
  return `${measure} by ${dimension}`;
}

export async function queryVisual(spec: VisualFilter): Promise<VisualOutput> {
  const yAgg = spec.yAgg ?? "sum";
  const x = spec.x.trim();
  const y = spec.y.trim();
  const series = spec.series?.trim() || undefined;

  if (spec.dataset === "monthly_pl") {
    return queryMonthlyVisual(spec, x, y, yAgg, series);
  }
  return queryTransactionVisual(spec, x, y, yAgg, series);
}

async function queryMonthlyVisual(
  spec: VisualFilter,
  x: string,
  y: string,
  yAgg: VisualFilter["yAgg"],
  series: string | undefined,
): Promise<VisualOutput> {
  if (series) {
    return fail(
      "monthly_pl is one row per month — there is no series field to split on.",
    );
  }
  if (!MONTHLY_X.has(x)) {
    return fail(
      `"${x}" is not a monthly_pl dimension. Use label (month).`,
    );
  }
  if (!MONTHLY_Y.has(y)) {
    return fail(
      `"${y}" is not a monthly_pl measure. Use revenue, expenses, cash, or netBurn.`,
    );
  }
  if (yAgg === "count") {
    return fail("count is only valid with y=id on transactions.");
  }

  const months = spec.months ?? 6;
  const rows = trailing(await loadMonthly(), months).map((row) => ({
    x: row.label,
    y: row[y as "revenue" | "expenses" | "cash" | "netBurn"],
  }));

  if (rows.length === 0) {
    return fail("No monthly_pl rows matched this spec.");
  }

  const mark = resolveMark(spec.mark, undefined);
  if (mark === "pie") {
    const positive = rows.filter((row) => row.y > 0);
    if (positive.length === 0) {
      return fail("A pie needs positive values; this monthly series is zero or negative.");
    }
    return monthlyView(spec, mark, y, months, positive);
  }

  return monthlyView(spec, mark, y, months, rows);
}

function monthlyView(
  spec: VisualFilter,
  mark: VisualFilter["mark"],
  y: string,
  months: MonthsFilter,
  rows: { x: string; y: number }[],
): VisualOutput {
  return {
    unsupported: false,
    title: defaultVisualTitle(spec),
    subtitle: spec.subtitle ?? periodSubtitle(months),
    mark,
    xKey: "label",
    yKey: y,
    months,
    rows,
  };
}

async function queryTransactionVisual(
  spec: VisualFilter,
  x: string,
  y: string,
  yAgg: VisualFilter["yAgg"],
  series: string | undefined,
): Promise<VisualOutput> {
  if (!TXN_X.has(x)) {
    return fail(
      `"${x}" is not a transactions dimension. Use segment or status.`,
    );
  }
  if (!TXN_Y.has(y)) {
    return fail(
      `"${y}" is not a transactions measure. Use amount (sum/avg) or id (count).`,
    );
  }
  if (y === "id" && yAgg !== "count") {
    return fail("y=id is a count field; set yAgg to count.");
  }
  if (y === "amount" && yAgg === "count") {
    return fail("count belongs with y=id, not amount.");
  }
  if (series) {
    if (!TXN_SERIES.has(series)) {
      return fail(
        `"${series}" is not a transactions series. Use status or segment.`,
      );
    }
    if (series === x) {
      return fail("series must be a different field from x.");
    }
  }
  if (spec.mark === "pie" && series) {
    return fail("A pie cannot split on a series; omit series or use grouped_bar.");
  }

  let ledger = await loadLedger();
  const status = spec.status && spec.status !== "all" ? spec.status : undefined;
  if (status) ledger = ledger.filter((row) => row.status === status);

  const grouped = new Map<
    string,
    { x: string; series?: string; sum: number; n: number }
  >();

  for (const row of ledger) {
    const xValue = readTxnDimension(row, x);
    const seriesValue = series ? readTxnDimension(row, series) : undefined;
    const key = seriesValue ? `${xValue}\0${seriesValue}` : xValue;
    const bucket = grouped.get(key) ?? {
      x: xValue,
      series: seriesValue,
      sum: 0,
      n: 0,
    };
    bucket.n += 1;
    bucket.sum += y === "id" ? 1 : row.amount;
    grouped.set(key, bucket);
  }

  let rows = [...grouped.values()]
    .map((bucket) => ({
      x: bucket.x,
      series: bucket.series,
      y:
        yAgg === "avg"
          ? bucket.n === 0
            ? 0
            : bucket.sum / bucket.n
          : yAgg === "count"
            ? bucket.n
            : bucket.sum,
    }))
    .sort((a, b) => {
      const byX = a.x.localeCompare(b.x);
      if (byX !== 0) return byX;
      return (a.series ?? "").localeCompare(b.series ?? "");
    });

  if (rows.length === 0) {
    return fail("No transactions matched this spec.");
  }

  const mark = resolveMark(spec.mark, series);

  if (mark === "pie") {
    rows = rows.filter((row) => row.y > 0);
    if (rows.length === 0) {
      return fail(
        "A pie needs positive values; this grouping is zero or negative.",
      );
    }
  }

  return {
    unsupported: false,
    title: defaultVisualTitle(spec, series),
    subtitle: spec.subtitle,
    mark,
    xKey: x,
    yKey: y,
    seriesKey: series,
    rows,
  };
}

function readTxnDimension(
  row: TransactionRow,
  field: string,
): string {
  if (field === "status") return row.status;
  return row.segment ?? "Unknown";
}

const GENERATED_ROW_CAP = 48;

export type RenderGeneratedUiContext = {
  chatId?: string;
  knowledgeMode?: boolean;
};

function isKnowledgeSourceId(dataset: string) {
  return dataset.startsWith("ks_");
}

export async function renderGeneratedUi(
  spec: GeneratedUiFilter,
  ctx?: RenderGeneratedUiContext,
): Promise<GeneratedUiOutput> {
  const sanitized = sanitizeGeneratedCode(spec.code);
  if (!sanitized.ok) {
    return { ok: false, reason: sanitized.reason };
  }

  if (ctx?.knowledgeMode && !isKnowledgeSourceId(spec.dataset)) {
    return {
      ok: false,
      reason:
        "This thread uses your uploaded tables. Pass a source id (ks_...) as dataset.",
    };
  }

  if (!ctx?.knowledgeMode && isKnowledgeSourceId(spec.dataset)) {
    return {
      ok: false,
      reason: "No uploaded tables on this thread. Use monthly_pl or transactions.",
    };
  }

  if (isKnowledgeSourceId(spec.dataset)) {
    if (!ctx?.chatId) {
      return { ok: false, reason: "Missing chat id for uploaded tables." };
    }
    const source = await getKnowledgeSource(ctx.chatId, spec.dataset);
    if (!source) {
      return {
        ok: false,
        reason: "Unknown table. Use one of the uploaded source ids.",
      };
    }
    if (source.kind !== "table") {
      return {
        ok: false,
        reason: "PDFs are not chartable. Use a CSV or Excel sheet.",
      };
    }
    return {
      ok: true,
      code: sanitized.code,
      data: {
        dataset: "knowledge",
        sourceId: source.id,
        filename: source.filename,
        columns: source.columns,
        rows: source.rows.slice(0, GENERATED_ROW_CAP),
      },
    };
  }

  if (spec.dataset === "monthly_pl") {
    const months = spec.months ?? 6;
    const rows = trailing(await loadMonthly(), months).slice(
      0,
      GENERATED_ROW_CAP,
    );
    return {
      ok: true,
      code: sanitized.code,
      data: { dataset: "monthly_pl", months, rows },
    };
  }

  if (spec.dataset === "transactions") {
    const status = spec.status ?? "all";
    let rows = await loadLedger();
    if (status !== "all") rows = rows.filter((row) => row.status === status);
    return {
      ok: true,
      code: sanitized.code,
      data: {
        dataset: "transactions",
        status,
        rows: rows.slice(0, GENERATED_ROW_CAP),
      },
    };
  }

  return {
    ok: false,
    reason: "Unknown dataset. Use monthly_pl, transactions, or a source id.",
  };
}
