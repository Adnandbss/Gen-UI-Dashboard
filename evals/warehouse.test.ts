import { describe, expect, it } from "vitest";

import {
  getKpis,
  getRevenueSeries,
  getRunway,
  getTransactions,
} from "@/lib/warehouse/queries";
import { MONTHLY_PL, TRANSACTIONS } from "@/lib/warehouse/seed-data";

const last6 = MONTHLY_PL.slice(-6);
const last6Revenue = last6.reduce((sum, row) => sum + row.revenue, 0);
const last6Expenses = last6.reduce((sum, row) => sum + row.expenses, 0);

describe("warehouse seed totals", () => {
  it("returns the last 6 months of P&L matching seed revenue and expenses", async () => {
    const view = await getRevenueSeries({ months: 6 });
    expect(view.data).toHaveLength(6);
    expect(view.data.reduce((sum, row) => sum + row.revenue, 0)).toBe(last6Revenue);
    expect(view.data.reduce((sum, row) => sum + row.expenses, 0)).toBe(
      last6Expenses,
    );
    expect(view.data[0]?.month).toBe("Mar");
    expect(view.data.at(-1)?.month).toBe("Aug");
  });

  it("returns all 12 seeded months for a yearly series", async () => {
    const view = await getRevenueSeries({ months: 12 });
    expect(view.data).toHaveLength(12);
    expect(view.data.reduce((sum, row) => sum + row.revenue, 0)).toBe(
      MONTHLY_PL.reduce((sum, row) => sum + row.revenue, 0),
    );
  });

  it("lists every seeded transaction, newest first", async () => {
    const view = await getTransactions({ status: "all" });
    expect(view.transactions).toHaveLength(TRANSACTIONS.length);
    expect(view.transactions[0]?.id).toBe("TXN-4092");
  });

  it("filters pending rows and can look up a single id", async () => {
    const pending = await getTransactions({ status: "Pending" });
    expect(pending.transactions.every((row) => row.status === "Pending")).toBe(
      true,
    );
    expect(pending.transactions).toHaveLength(
      TRANSACTIONS.filter((row) => row.status === "Pending").length,
    );

    const one = await getTransactions({ id: "TXN-4092" });
    expect(one.transactions).toHaveLength(1);
    expect(one.transactions[0]?.amount).toBe(84_000);
  });

  it("serves the overview and burn KPI snapshots from seed", async () => {
    const overview = await getKpis({ set: "overview" });
    expect(overview.metrics[0]).toMatchObject({
      title: "Net Revenue",
      value: "$548,000",
    });

    const burn = await getKpis({ set: "burn" });
    expect(burn.metrics.map((metric) => metric.title)).toEqual([
      "Burn Multiple",
      "Net Burn",
      "Runway",
    ]);
  });

  it("computes August runway as cash / net burn from seed", async () => {
    const august = MONTHLY_PL.at(-1)!;
    const view = await getRunway({ months: 6 });
    expect(view.cashOnHand).toBe(august.cash);
    expect(view.netBurn).toBe(august.netBurn);
    expect(view.monthsOfRunway).toBe(august.cash / august.netBurn);
    expect(view.data).toHaveLength(6);
  });
});
