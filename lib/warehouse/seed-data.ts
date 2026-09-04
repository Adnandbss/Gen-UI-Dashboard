/**
 * Canonical Acme Capital figures. Neon is seeded from this module, and the
 * in-process warehouse fallback reads the same objects so demo clones without
 * DATABASE_URL still serve identical numbers.
 */

export type MonthlyPlRow = {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  cash: number;
  netBurn: number;
};

export type TransactionRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "Completed" | "Pending";
  segment: string | null;
};

export type KpiRow = {
  kpiSet: "overview" | "burn" | "churn";
  sortOrder: number;
  title: string;
  value: string;
  trend: string;
  isPositive: boolean;
};

export const MONTHLY_PL: MonthlyPlRow[] = [
  { month: "2025-09", label: "Sep", revenue: 360_000, expenses: 295_000, cash: 1_528_000, netBurn: 72_000 },
  { month: "2025-10", label: "Oct", revenue: 372_000, expenses: 301_000, cash: 1_460_000, netBurn: 68_000 },
  { month: "2025-11", label: "Nov", revenue: 381_000, expenses: 308_000, cash: 1_396_000, netBurn: 64_000 },
  { month: "2025-12", label: "Dec", revenue: 395_000, expenses: 312_000, cash: 1_335_000, netBurn: 61_000 },
  { month: "2026-01", label: "Jan", revenue: 401_000, expenses: 318_000, cash: 1_277_000, netBurn: 58_000 },
  { month: "2026-02", label: "Feb", revenue: 408_000, expenses: 321_000, cash: 1_222_000, netBurn: 55_000 },
  { month: "2026-03", label: "Mar", revenue: 412_000, expenses: 318_000, cash: 1_170_000, netBurn: 52_000 },
  { month: "2026-04", label: "Apr", revenue: 438_000, expenses: 331_000, cash: 1_120_000, netBurn: 50_000 },
  { month: "2026-05", label: "May", revenue: 421_000, expenses: 342_000, cash: 1_070_000, netBurn: 56_000 },
  { month: "2026-06", label: "Jun", revenue: 476_000, expenses: 349_000, cash: 1_014_000, netBurn: 54_000 },
  { month: "2026-07", label: "Jul", revenue: 519_000, expenses: 358_000, cash: 960_000, netBurn: 62_000 },
  { month: "2026-08", label: "Aug", revenue: 548_000, expenses: 366_000, cash: 912_000, netBurn: 48_000 },
];

export const TRANSACTIONS: TransactionRow[] = [
  {
    id: "TXN-4092",
    date: "2026-08-29",
    description: "Northwind Logistics — Annual license",
    amount: 84_000,
    status: "Completed",
    segment: "Enterprise",
  },
  {
    id: "TXN-4088",
    date: "2026-08-27",
    description: "AWS — Compute & storage",
    amount: -31_450.75,
    status: "Completed",
    segment: "Ops",
  },
  {
    id: "TXN-4081",
    date: "2026-08-24",
    description: "Meridian Health — Platform expansion",
    amount: 47_500,
    status: "Pending",
    segment: "Healthcare",
  },
  {
    id: "TXN-4076",
    date: "2026-08-21",
    description: "Payroll — August cycle",
    amount: -186_200,
    status: "Completed",
    segment: "People",
  },
  {
    id: "TXN-4070",
    date: "2026-08-18",
    description: "Atlas Retail Group — Seat true-up",
    amount: 22_800,
    status: "Completed",
    segment: "Mid-market",
  },
  {
    id: "TXN-4063",
    date: "2026-08-15",
    description: "Quarterly SOC 2 audit — Vantage LLP",
    amount: -18_000,
    status: "Pending",
    segment: "Ops",
  },
  {
    id: "TXN-4059",
    date: "2026-08-12",
    description: "Helios Manufacturing — Renewal",
    amount: 61_250,
    status: "Completed",
    segment: "Manufacturing",
  },
];

export const KPIS: KpiRow[] = [
  {
    kpiSet: "overview",
    sortOrder: 0,
    title: "Net Revenue",
    value: "$548,000",
    trend: "+5.6% vs. July",
    isPositive: true,
  },
  {
    kpiSet: "overview",
    sortOrder: 1,
    title: "Gross Margin",
    value: "66.2%",
    trend: "+1.8 pts vs. Q2 average",
    isPositive: true,
  },
  {
    kpiSet: "overview",
    sortOrder: 2,
    title: "Burn Multiple",
    value: "0.94x",
    trend: "-0.12x vs. July",
    isPositive: true,
  },
  {
    kpiSet: "burn",
    sortOrder: 0,
    title: "Burn Multiple",
    value: "0.94x",
    trend: "-0.12x vs. July",
    isPositive: true,
  },
  {
    kpiSet: "burn",
    sortOrder: 1,
    title: "Net Burn",
    value: "$48,000",
    trend: "Down from $62k in July",
    isPositive: true,
  },
  {
    kpiSet: "burn",
    sortOrder: 2,
    title: "Runway",
    value: "19 months",
    trend: "+2 months vs. Q2 close",
    isPositive: true,
  },
  {
    kpiSet: "churn",
    sortOrder: 0,
    title: "Gross logo churn",
    value: "1.8%",
    trend: "-0.4 pts vs. July",
    isPositive: true,
  },
  {
    kpiSet: "churn",
    sortOrder: 1,
    title: "Net revenue retention",
    value: "114%",
    trend: "+3 pts vs. Q2",
    isPositive: true,
  },
  {
    kpiSet: "churn",
    sortOrder: 2,
    title: "At-risk ARR",
    value: "$86,400",
    trend: "3 enterprise accounts in the 60-day bucket",
    isPositive: false,
  },
];
