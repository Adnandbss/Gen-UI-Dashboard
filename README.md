# Ledger — A Zero-Static Generative UI Dashboard

A financial dashboard with no dashboard in it.

There are no hardcoded charts, no prebuilt report pages, no static layout waiting
to be filled. You ask a question, and the language model assembles the answer out
of real React components — a Recharts bar chart, a cash-runway area, a
transactions ledger, a KPI scorecard — streamed into the conversation as it
decides what you need to see.

The model never returns a markdown table. It asks for a *view*. The warehouse
returns the numbers. The widget renders them.

**Live demo:** [gen-ui-dashboard-team-adnan.vercel.app](https://gen-ui-dashboard-team-adnan.vercel.app)

![The dashboard mid-response: KPI cards have resolved, the revenue chart has just
finished streaming, and the transactions table is still on its way.](docs/screenshot.png)

---

## Why this is interesting

Most "AI dashboard" demos are a chat box bolted onto a fixed page. This one
inverts that: **the interface is the model's output.** The interesting work is in
the contract between them.

- **Query in, view out.** Tools take filters only (`months`, `status`, `kpiSet`).
  `execute` loads a typed view model from Neon (or the in-repo seed). Widgets
  parse `part.output` — they never paint invented JSON from `part.input`.
- **The schema is the contract.** Filter schemas and view schemas live in
  [`ai/schemas.ts`](ai/schemas.ts). A tool and its component physically cannot
  drift apart.
- **One seed, every surface.** Demo mode, a live model, and `npm run eval` all
  read the same Acme Capital figures. No API key, no `DATABASE_URL`, still the
  same August revenue.
- **Shareable threads.** The first visit to `/` lands on `/c/[id]`. Copy the
  link; anyone with it can replay the widgets. There is no login — links are
  capability URLs, which is fine for a public demo and **not** a place to put
  private data.
- **Streaming-aware skeletons.** While a tool sits in `input-streaming` or
  `input-available` (warehouse still running) the UI shows a skeleton shaped like
  the widget it's about to become.
- **It runs with no API key.** See [demo mode](#demo-mode) below.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 |
| Language | TypeScript (strict) |
| AI | Vercel AI SDK v7 · AI Gateway or OpenAI |
| Data | Neon Postgres · Drizzle ORM · `@neondatabase/serverless` |
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

Numbers come from the in-repo seed until you attach Neon:

```bash
cp .env.example .env.local
# DATABASE_URL=postgres://...   (from Vercel Marketplace → Neon)
npm run db:push
npm run db:seed
```

To let a real model *choose* the tools (instead of the keyword router):

```bash
# Google AI Studio: GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY)
# or AI_GATEWAY_API_KEY, or OPENAI_API_KEY
```

Until that key is set, production stays on the mock model + the warehouse, so
the widgets still show real seed (or Neon) numbers.

## Demo mode

With no provider credentials configured, the app swaps in a scripted model that
speaks the same provider protocol as a real one — streaming tool *filters*
chunk by chunk, then emitting the tool call. `execute` still hits the warehouse.
Every layer below it (`streamText`, the UI message stream, the skeleton states)
behaves exactly as it does in production; only the source of the tokens changes.

The header shows a **Demo mode** badge whenever it's active. Range chips, row
clicks, and KPI drill-downs are real chat turns — they re-query, they don't
filter on the client — so a shared thread replays the same evidence.

## The warehouse

Neon is the system of record for Acme Capital: monthly P&L, transactions, KPI
snapshots, chat threads, and rate-limit events. Query helpers live in
[`lib/warehouse/queries.ts`](lib/warehouse/queries.ts).

If `DATABASE_URL` is missing, those helpers fall back to
[`lib/warehouse/seed-data.ts`](lib/warehouse/seed-data.ts) so a fresh clone still
runs. Shareable threads and durable rate limits (20 requests / 10 minutes per
hashed IP) need Neon in production.

Create the database on the `gen-ui-dashboard` Vercel project (Marketplace →
Neon), pull env, then:

```bash
npm run db:push && npm run db:seed
```

The same commands against production: `vercel env pull` then seed, or run them
once with the production `DATABASE_URL`.

## The four tools

Each maps one-to-one onto a component in `components/widgets/`.

| Tool | Renders | Filters |
|---|---|---|
| `show_kpi_metrics` | `KpiCardsWidget` | `kpiSet`: overview / burn / churn |
| `show_revenue_chart` | `RevenueChartWidget` | `months`: 3 / 6 / 12 |
| `show_transactions_list` | `TransactionsGridWidget` | `status`, optional `id` |
| `show_runway` | `RunwayWidget` | `months`: 3 / 6 / 12 |

A broad question like *"give me the full dashboard"* triggers KPIs, the
revenue chart, and transactions in a single turn, followed by a written read
on what the numbers mean. Asking about runway gets its own area chart — not a
fourth KPI row.

## How a message becomes UI

```
user question
  └─ POST /api/chat   (rate-limited, then upserted to chats)
       └─ streamText({ tools, stopWhen: isStepCount(4) })
            ├─ step 1 → tool calls with *filters* only
            ├─ execute → warehouse view model → part.output
            └─ step 2 → written analysis of what just rendered
  └─ useChat → message.parts
       ├─ "text"                       → prose
       ├─ "tool-show_revenue_chart"    → skeleton → <RevenueChartWidget />
       ├─ "tool-show_transactions_list"→ skeleton → <TransactionsGridWidget />
       ├─ "tool-show_kpi_metrics"      → skeleton → <KpiCardsWidget />
       └─ "tool-show_runway"           → skeleton → <RunwayWidget />
```

Raw tool arguments are never shown to the user — they only ever appear as
rendered components.

## Shareable threads

Visiting `/` redirects to `/c/[id]`. After the stream finishes, messages are
stored as UIMessage JSON (not ModelMessage). The sidebar **Recent** list is
`GET /api/chats` (title = first user prompt, truncated). **Copy link** puts
the current URL on the clipboard.

Ids are opaque tokens (`/^[A-Za-z0-9_-]+$/`). Anyone with the URL can read
the thread. Don't paste real financials into a public demo.

## Project layout

```
ai/
  schemas.ts         Filter + view Zod schemas (the contract)
  tools.ts           Query-in / view-out tools
  types.ts           InferUITools → typed ChatMessage
  prompt.ts          System prompt
  demo-model.ts      Protocol-level mock model for demo mode
  demo-data.ts       Keyword router → filters only
db/
  schema.ts          Drizzle tables
  seed.ts            `npm run db:seed`
lib/
  warehouse/         Query API + seed fallback
  chat-store.ts      chats + messages persistence
  rate-limit.ts      hashed IP, 20 / 10 minutes
app/
  page.tsx           Redirects to /c/[id]
  c/[id]/page.tsx    Loads a thread, hydrates ChatShell
  api/chat/route.ts  streamText, persist, rate limit
  api/chats/route.ts Recent list
components/
  chat/ChatShell.tsx Shared UI for / and /c/[id]
  widgets/           Four generative widgets + skeletons
evals/
  warehouse.test.ts  Seed totals
  planner.test.ts    ~15 prompt → filter mappings
```

## Choosing a model

`CHAT_MODEL` accepts any `provider/model` slug when routed through the Vercel AI
Gateway, so switching from OpenAI to Anthropic or Google is a one-line env change
with no code edit:

```bash
CHAT_MODEL=anthropic/claude-sonnet-4.5
```

With a Google AI Studio key, the default model is `google/gemini-2.5-flash`.
Override with `CHAT_MODEL=google/gemini-2.5-pro` (or another Gemini id) if you
want a larger model.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run eval       # warehouse + planner tests
npm run db:push    # drizzle-kit push (needs DATABASE_URL)
npm run db:seed    # seed Acme Capital into Neon
```
