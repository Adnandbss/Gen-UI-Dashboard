import { describe, expect, it } from "vitest";

import { parseMonths, planDemoResponse } from "@/ai/demo-data";

function toolsOf(prompt: string) {
  return planDemoResponse(prompt).toolCalls.map((call) => call.toolName);
}

function call<T extends string>(prompt: string, toolName: T) {
  return planDemoResponse(prompt).toolCalls.find(
    (entry) => entry.toolName === toolName,
  ) as Extract<ReturnType<typeof planDemoResponse>["toolCalls"][number], { toolName: T }> | undefined;
}

describe("demo planner filters", () => {
  it("maps a board pack to overview KPIs, 6-month revenue, and the full ledger", () => {
    const plan = planDemoResponse("Give me the full dashboard for August.");
    expect(plan.toolCalls.map((call) => call.toolName)).toEqual([
      "show_kpi_metrics",
      "show_revenue_chart",
      "show_transactions_list",
    ]);
    expect(call("Give me the full dashboard for August.", "show_kpi_metrics")?.input).toEqual({
      kpiSet: "overview",
    });
    expect(call("Give me the full dashboard for August.", "show_revenue_chart")?.input).toEqual({
      months: 6,
    });
    expect(
      call("Give me the full dashboard for August.", "show_transactions_list")?.input,
    ).toEqual({ status: "all" });
  });

  it("requests 6 months of revenue for the default trend prompt", () => {
    const input = call(
      "How did revenue trend against expenses over the last 6 months?",
      "show_revenue_chart",
    )?.input;
    expect(input).toEqual({ months: 6 });
  });

  it("lists recent transactions without a status filter", () => {
    expect(
      call("Show me the most recent transactions.", "show_transactions_list")?.input,
    ).toEqual({ status: "all" });
  });

  it("filters the ledger to pending when asked for unsettled payments", () => {
    expect(
      call("What payments are still pending?", "show_transactions_list")?.input,
    ).toEqual({ status: "Pending" });
    expect(
      call("Show pending invoices", "show_transactions_list")?.input,
    ).toEqual({ status: "Pending" });
  });

  it("routes churn questions to the churn KPI set", () => {
    expect(call("How is churn looking by segment?", "show_kpi_metrics")?.input).toEqual({
      kpiSet: "churn",
    });
  });

  it("pairs burn-multiple questions with the burn scorecard and a chart", () => {
    const plan = planDemoResponse(
      "Walk me through the burn multiple and how it moved with revenue.",
    );
    expect(plan.toolCalls.map((call) => call.toolName)).toEqual([
      "show_kpi_metrics",
      "show_revenue_chart",
    ]);
    expect(plan.toolCalls[0]?.input).toEqual({ kpiSet: "burn" });
  });

  it("honours 3- and 12-month range chips", () => {
    expect(parseMonths("Show revenue vs expenses for the last 12 months.")).toBe(12);
    expect(parseMonths("Show revenue vs expenses for the last 3 months.")).toBe(3);
    expect(
      call("Show revenue vs expenses for the last 12 months.", "show_revenue_chart")
        ?.input,
    ).toEqual({ months: 12 });
    expect(
      call("Show revenue vs expenses for the last 3 months.", "show_revenue_chart")
        ?.input,
    ).toEqual({ months: 3 });
  });

  it("answers conceptual questions in prose", () => {
    expect(toolsOf("What is a burn multiple?")).toEqual([]);
    expect(planDemoResponse("What is a burn multiple?").intro).toMatch(/net burn/i);
  });

  it("renders runway as its own chart, including a 12-month chip", () => {
    expect(toolsOf("Show me the cash runway.")).toEqual(["show_runway"]);
    expect(
      call("Show cash runway for the last 12 months.", "show_runway")?.input,
    ).toEqual({ months: 12 });
  });

  it("uses the overview scorecard for a health snapshot", () => {
    expect(call("Give me a snapshot of how we are doing.", "show_kpi_metrics")?.input).toEqual({
      kpiSet: "overview",
    });
  });

  it("looks up a named transaction id", () => {
    expect(
      call("Explain transaction TXN-4092.", "show_transactions_list")?.input,
    ).toEqual({ status: "all", id: "TXN-4092" });
  });

  it("does not render widgets for workspace settings", () => {
    expect(toolsOf("What can I configure in this workspace?")).toEqual([]);
  });

  it("turns a KPI drill-down into a revenue chart", () => {
    expect(toolsOf("Break down Net Revenue.")).toEqual(["show_revenue_chart"]);
  });
});
