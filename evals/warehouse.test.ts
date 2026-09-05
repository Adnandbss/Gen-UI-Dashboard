import { describe, expect, it } from "vitest";

import {
  getKpis,
  getRevenueSeries,
  getRunway,
  getTransactions,
  queryVisual,
  renderGeneratedUi,
} from "@/lib/warehouse/queries";
import { sanitizeGeneratedCode, stripMarkdownFences } from "@/lib/generated-ui/sanitize";
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

describe("queryVisual catalog", () => {
  it("groups positive segment inflows to match seed", async () => {
    const view = await queryVisual({
      dataset: "transactions",
      mark: "pie",
      x: "segment",
      y: "amount",
      yAgg: "sum",
    });
    expect(view.unsupported).toBe(false);
    if (view.unsupported) return;

    const expected = new Map<string, number>();
    for (const row of TRANSACTIONS) {
      if (row.amount <= 0 || !row.segment) continue;
      expected.set(row.segment, (expected.get(row.segment) ?? 0) + row.amount);
    }

    expect(view.rows).toHaveLength(expected.size);
    for (const [segment, total] of expected) {
      expect(view.rows.find((row) => row.x === segment)?.y).toBe(total);
    }
  });

  it("returns a cash series whose length matches the requested months", async () => {
    const view = await queryVisual({
      dataset: "monthly_pl",
      mark: "area",
      x: "label",
      y: "cash",
      yAgg: "sum",
      months: 6,
    });
    expect(view.unsupported).toBe(false);
    if (view.unsupported) return;
    expect(view.rows).toHaveLength(6);
    expect(view.months).toBe(6);
    expect(view.rows.map((row) => row.y)).toEqual(
      MONTHLY_PL.slice(-6).map((row) => row.cash),
    );
  });

  it("rejects unknown fields and datasets the catalog cannot answer", async () => {
    const country = await queryVisual({
      dataset: "monthly_pl",
      mark: "bar",
      x: "country",
      y: "revenue",
      yAgg: "sum",
    });
    expect(country).toMatchObject({ unsupported: true });
    if (!country.unsupported) return;
    expect(country.reason).toMatch(/country|dimension/i);

    const weekly = await queryVisual({
      dataset: "transactions",
      mark: "line",
      x: "segment",
      y: "weekly",
      yAgg: "sum",
    });
    expect(weekly.unsupported).toBe(true);
  });
});

describe("generated UI sanitize and warehouse data", () => {
  it("strips markdown fences from model source", () => {
    expect(stripMarkdownFences("```jsx\nexport default function View() {}\n```")).toBe(
      "export default function View() {}",
    );
  });

  it("rejects fetch, eval, and sockets in generated source", () => {
    expect(sanitizeGeneratedCode("export default function View() { fetch('/api') }").ok).toBe(
      false,
    );
    expect(sanitizeGeneratedCode("export default function View({ data }) { return null }").ok).toBe(
      true,
    );
  });

  it("injects warehouse rows and ignores any numbers in the source", async () => {
    const view = await renderGeneratedUi({
      dataset: "transactions",
      code: "```jsx\nexport default function View({ data }) { return data.rows.length }\n```",
    });
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.data.dataset).toBe("transactions");
    if (view.data.dataset !== "transactions") return;
    expect(view.data.rows).toHaveLength(TRANSACTIONS.length);
    expect(view.data.rows[0]?.amount).toBe(TRANSACTIONS[0]?.amount);
    expect(view.code).not.toMatch(/```/);
  });

  it("returns a cash series whose length matches the requested months", async () => {
    const view = await renderGeneratedUi({
      dataset: "monthly_pl",
      months: 6,
      code: "export default function View({ data }) { return null }",
    });
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.data.dataset).toBe("monthly_pl");
    if (view.data.dataset !== "monthly_pl") return;
    expect(view.data.rows).toHaveLength(6);
    expect(view.data.rows.map((row) => row.cash)).toEqual(
      MONTHLY_PL.slice(-6).map((row) => row.cash),
    );
  });
});
