import { and, desc, eq } from "drizzle-orm";

import type {
  KpiMetricsInput,
  KpiSet,
  MonthsFilter,
  RevenueChartInput,
  RunwayInput,
  TransactionStatus,
  TransactionsListInput,
} from "@/ai/schemas";
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

export async function getRevenueSeries(options?: {
  months?: MonthsFilter;
}): Promise<RevenueChartInput> {
  const months = options?.months ?? 6;

  if (!hasDatabase()) {
    return revenueView(trailing(MONTHLY_PL, months), months);
  }

  const rows = await getDb()
    .select()
    .from(monthlyPl)
    .orderBy(monthlyPl.month);
  return revenueView(trailing(rows, months), months);
}

export async function getTransactions(options?: {
  status?: "all" | TransactionStatus;
  id?: string;
}): Promise<TransactionsListInput> {
  const status = options?.status ?? "all";
  const id = options?.id?.toUpperCase();

  if (!hasDatabase()) {
    let rows = TRANSACTIONS;
    if (id) rows = rows.filter((row) => row.id.toUpperCase() === id);
    else if (status !== "all") rows = rows.filter((row) => row.status === status);
    return transactionView(rows, status);
  }

  const db = getDb();
  const filters = [];
  if (id) filters.push(eq(transactions.id, id));
  else if (status !== "all") filters.push(eq(transactions.status, status));

  const rows = await db
    .select()
    .from(transactions)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(transactions.date));

  return transactionView(
    rows.map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      status: row.status as TransactionStatus,
      segment: row.segment,
    })),
    status,
  );
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

  if (!hasDatabase()) {
    return runwayView(trailing(MONTHLY_PL, months), months);
  }

  const rows = await getDb()
    .select()
    .from(monthlyPl)
    .orderBy(monthlyPl.month);
  return runwayView(trailing(rows, months), months);
}
