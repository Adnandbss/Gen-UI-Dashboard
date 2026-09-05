import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "@/ai/prompt";
import { createChatTools } from "@/ai/tools";
import { parseSpreadsheet } from "@/lib/knowledge/parse";
import { insertParsedSources } from "@/lib/knowledge/store";
import { MAX_STORE_ROWS } from "@/lib/knowledge/types";
import { renderGeneratedUi } from "@/lib/warehouse/queries";

describe("knowledge spreadsheet parse", () => {
  it("turns a CSV into columns and typed rows", () => {
    const csv = "month,revenue\nJan,100\nFeb,200\n";
    const parsed = parseSpreadsheet(Buffer.from(csv), "sales.csv");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.kind).toBe("table");
    expect(parsed[0]?.columns).toEqual(["month", "revenue"]);
    expect(parsed[0]?.rows).toEqual([
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 200 },
    ]);
  });

  it("caps stored rows and flags truncation", () => {
    const header = "n,v";
    const lines = Array.from({ length: MAX_STORE_ROWS + 25 }, (_, i) => `${i},${i}`);
    const parsed = parseSpreadsheet(
      Buffer.from([header, ...lines].join("\n")),
      "wide.csv",
    );
    expect(parsed[0]?.truncated).toBe(true);
    expect(parsed[0]?.rows).toHaveLength(MAX_STORE_ROWS);
  });
});

describe("knowledge tools and prompt", () => {
  it("omits the four Acme tools once a thread is in file mode", () => {
    expect(Object.keys(createChatTools({ knowledgeMode: true }))).toEqual([
      "show_generated_ui",
    ]);
    expect(Object.keys(createChatTools())).toEqual([
      "show_revenue_chart",
      "show_transactions_list",
      "show_kpi_metrics",
      "show_runway",
      "show_generated_ui",
    ]);
  });

  it("lists column names only — never cell values — in the system prompt", () => {
    const prompt = buildSystemPrompt([
      {
        id: "ks_abc",
        filename: "sales.csv",
        kind: "table",
        columns: ["month", "revenue"],
        rowCount: 2,
        truncated: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(prompt).toContain("ks_abc");
    expect(prompt).toContain("month, revenue");
    expect(prompt).toContain("2 rows");
    expect(prompt).not.toContain("548000");
    expect(prompt).not.toMatch(/Jan,\s*100/);
  });
});

describe("renderGeneratedUi knowledge datasets", () => {
  it("injects uploaded rows and refuses Acme datasets on that thread", async () => {
    const parsed = parseSpreadsheet(
      Buffer.from("segment,amount\nEnterprise,50\nSMB,25\n"),
      "mix.csv",
    );
    const [source] = await insertParsedSources("chat_knowledge_eval", parsed);
    expect(source?.id).toMatch(/^ks_/);

    const view = await renderGeneratedUi(
      {
        dataset: source!.id,
        code: "export default function View({ data }) { return data.rows.length }",
      },
      { chatId: "chat_knowledge_eval", knowledgeMode: true },
    );
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.data.dataset).toBe("knowledge");
    if (view.data.dataset !== "knowledge") return;
    expect(view.data.filename).toBe("mix.csv");
    expect(view.data.columns).toEqual(["segment", "amount"]);
    expect(view.data.rows).toEqual([
      { segment: "Enterprise", amount: 50 },
      { segment: "SMB", amount: 25 },
    ]);

    const acme = await renderGeneratedUi(
      {
        dataset: "monthly_pl",
        code: "export default function View({ data }) { return null }",
      },
      { chatId: "chat_knowledge_eval", knowledgeMode: true },
    );
    expect(acme.ok).toBe(false);
    if (acme.ok) return;
    expect(acme.reason).toMatch(/uploaded tables/i);
  });
});
