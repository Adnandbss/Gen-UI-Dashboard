# Ledger — A Zero-Static Generative UI Dashboard

A financial dashboard with no dashboard in it.

There are no hardcoded charts, no prebuilt report pages, no static layout waiting
to be filled. You ask a question, and the language model assembles the answer out
of real React components — a Recharts bar chart, a transactions ledger, a KPI
scorecard — streamed into the conversation as it decides what you need to see.

The model never returns a markdown table. It returns UI.

![The dashboard mid-response: KPI cards have resolved, the revenue chart has just
finished streaming, and the transactions table is still on its way.](docs/screenshot.png)

---

## Why this is interesting

Most "AI dashboard" demos are a chat box bolted onto a fixed page. This one
inverts that: **the interface is the model's output.** The interesting work is in
the contract between them.

- **The schema is the contract.** Every widget's props are inferred from the same
  Zod schema its tool validates against ([`ai/schemas.ts`](ai/schemas.ts)). A tool
  and its component physically cannot drift apart — change the schema and both the
  server-side validation and the client-side prop types move together, or the
  build fails.
- **Fully typed tool parts.** `InferUITools` flows tool input types through
  `useChat`, so `part.input` is a strongly typed `RevenueChartInput` at the render
  site rather than `unknown` waiting for a cast.
- **Widgets render from tool *input*, not output.** The model already produced the
  payload when it called the tool; echoing it back through `execute` would roughly
  double token cost for zero gain. `execute` returns a one-line acknowledgement so
  the model knows the render landed and can comment on it.
- **Streaming-aware skeletons.** Tool arguments arrive token by token. While a
  part sits in `input-streaming` the UI shows a skeleton shaped like the widget
  it's about to become, so the transcript never jumps.
- **It runs with no API key.** See [demo mode](#demo-mode) below.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 |
| Language | TypeScript (strict) |
| AI | Vercel AI SDK v7 · AI Gateway or OpenAI |
| Validation | Zod 4 |
| UI | Tailwind CSS v4 · shadcn/ui · Recharts 3 · lucide-react |

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — not the Network IP Next prints. Next 16
blocks JS on LAN origins unless the host is allowlisted; `next.config.ts`
already allowlists this machine's private addresses, but `localhost` is the
reliable URL.

To let a real model drive the widgets:

```bash
cp .env.example .env.local
# add AI_GATEWAY_API_KEY (recommended) or OPENAI_API_KEY
```

## Demo mode

With no provider credentials configured, the app swaps in a scripted model that
speaks the same provider protocol as a real one — streaming tool inputs chunk by
chunk, then emitting the tool call. Every layer below it (`streamText`, the UI
message stream, the skeleton states) behaves exactly as it does in production;
only the source of the tokens changes.

This means you can clone the repo and immediately see the whole experience, and it
The header shows a **Demo mode** badge whenever it's active. Try the sidebar
entries too — Overview, Revenue, Transactions, and the Recent items all fire
real prompts rather than sitting as decoration.

## The three tools

Each maps one-to-one onto a component in `components/widgets/`.

| Tool | Renders | Use |
|---|---|---|
| `show_kpi_metrics` | `KpiCardsWidget` | Headline scorecard — "how are we doing" |
| `show_revenue_chart` | `RevenueChartWidget` | Revenue vs. expenses over time |
| `show_transactions_list` | `TransactionsGridWidget` | Ledger-level activity |

A broad question like *"give me the full dashboard"* triggers all three in a
single turn, followed by a written read on what the numbers mean.

## How a message becomes UI

```
user question
  └─ POST /api/chat
       └─ streamText({ tools, stopWhen: isStepCount(4) })
            ├─ step 1 → tool calls, arguments streamed as JSON deltas
            └─ step 2 → written analysis of what just rendered
  └─ useChat → message.parts
       ├─ "text"                       → prose
       ├─ "tool-show_revenue_chart"    → skeleton → <RevenueChartWidget />
       ├─ "tool-show_transactions_list"→ skeleton → <TransactionsGridWidget />
       └─ "tool-show_kpi_metrics"      → skeleton → <KpiCardsWidget />
```

Raw tool arguments are never shown to the user — they only ever appear as
rendered components.

## Project layout

```
ai/
  schemas.ts       Zod schemas + inferred widget prop types (the contract)
  tools.ts         The three tools handed to the model
  types.ts         Type-only: InferUITools → typed ChatMessage
  prompt.ts        System prompt
  demo-model.ts    Protocol-level mock model for demo mode
  demo-data.ts     Scripted dataset + keyword router
app/
  api/chat/route.ts  streamText, provider resolution, demo fallback
  page.tsx           Chat shell + the message-part → widget switch
components/
  widgets/         The three generative widgets + their skeletons
  chat/            Sidebar, composer, empty state
  ui/              shadcn primitives
```

## Choosing a model

`CHAT_MODEL` accepts any `provider/model` slug when routed through the Vercel AI
Gateway, so switching from OpenAI to Anthropic or Google is a one-line env change
with no code edit:

```bash
CHAT_MODEL=anthropic/claude-sonnet-4.5
```

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```
