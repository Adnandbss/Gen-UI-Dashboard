"use client";

import { AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { ChatMessage } from "@/ai/types";
import {
  generatedUiOutputSchema,
  kpiMetricsSchema,
  revenueChartSchema,
  runwaySchema,
  transactionsListSchema,
} from "@/ai/schemas";
import { KpiCardsWidget } from "@/components/widgets/KpiCardsWidget";
import { TransactionsGridWidget } from "@/components/widgets/TransactionsGridWidget";
import {
  GeneratedUiSkeleton,
  KpiCardsSkeleton,
  RevenueChartSkeleton,
  RunwaySkeleton,
  TransactionsSkeleton,
} from "@/components/widgets/widget-skeletons";

const RevenueChartWidget = dynamic(
  () =>
    import("@/components/widgets/RevenueChartWidget").then(
      (mod) => mod.RevenueChartWidget,
    ),
  { ssr: false, loading: () => <RevenueChartSkeleton /> },
);

const RunwayWidget = dynamic(
  () =>
    import("@/components/widgets/RunwayWidget").then((mod) => mod.RunwayWidget),
  { ssr: false, loading: () => <RunwaySkeleton /> },
);

const GeneratedUiWidget = dynamic(
  () =>
    import("@/components/widgets/GeneratedUiWidget").then(
      (mod) => mod.GeneratedUiWidget,
    ),
  { ssr: false, loading: () => <GeneratedUiSkeleton /> },
);

type MessagePart = ChatMessage["parts"][number];

export function ToolError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="text-destructive bg-destructive/8 border-destructive/25 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function MessageParts({
  parts,
  messageId,
  onAsk,
  onRepair,
}: {
  parts: ChatMessage["parts"];
  messageId: string;
  onAsk?: (prompt: string) => void;
  onRepair?: (stack: string, dataset: "monthly_pl" | "transactions") => void;
}) {
  return (
    <>
      {parts.map((part, index) =>
        renderPart(part, `${messageId}-${index}`, onAsk, onRepair),
      )}
    </>
  );
}

function ToolFrame({
  state,
  skeleton,
  widget,
  errorText,
}: {
  state: string;
  skeleton: ReactNode;
  widget: ReactNode;
  errorText?: string;
}) {
  switch (state) {
    case "input-streaming":
    case "input-available":
      return skeleton;
    case "output-available":
      return widget ? <div className="animate-rise">{widget}</div> : skeleton;
    case "output-error":
      return <ToolError message={errorText ?? "This widget failed to render."} />;
    default:
      return null;
  }
}

function parseOutput<T>(
  part: { state: string; output?: unknown },
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false } },
) {
  if (part.state !== "output-available") return null;
  const parsed = schema.safeParse(part.output);
  return parsed.success ? parsed.data : null;
}

function renderPart(
  part: MessagePart,
  key: string,
  onAsk?: (prompt: string) => void,
  onRepair?: (stack: string, dataset: "monthly_pl" | "transactions") => void,
) {
  switch (part.type) {
    case "text":
      if (!part.text.trim()) return null;
      return (
        <p key={key} className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {part.text}
        </p>
      );

    case "tool-show_revenue_chart":
      return (
        <div key={key}>
          <ToolFrame
            state={part.state}
            skeleton={<RevenueChartSkeleton />}
            widget={(() => {
              const parsed = parseOutput(part, revenueChartSchema);
              return parsed ? (
                <RevenueChartWidget {...parsed} onAsk={onAsk} />
              ) : null;
            })()}
            errorText={"errorText" in part ? part.errorText : undefined}
          />
        </div>
      );

    case "tool-show_transactions_list":
      return (
        <div key={key}>
          <ToolFrame
            state={part.state}
            skeleton={<TransactionsSkeleton />}
            widget={(() => {
              const parsed = parseOutput(part, transactionsListSchema);
              return parsed ? (
                <TransactionsGridWidget {...parsed} onAsk={onAsk} />
              ) : null;
            })()}
            errorText={"errorText" in part ? part.errorText : undefined}
          />
        </div>
      );

    case "tool-show_kpi_metrics":
      return (
        <div key={key}>
          <ToolFrame
            state={part.state}
            skeleton={<KpiCardsSkeleton />}
            widget={(() => {
              const parsed = parseOutput(part, kpiMetricsSchema);
              return parsed ? <KpiCardsWidget {...parsed} onAsk={onAsk} /> : null;
            })()}
            errorText={"errorText" in part ? part.errorText : undefined}
          />
        </div>
      );

    case "tool-show_runway":
      return (
        <div key={key}>
          <ToolFrame
            state={part.state}
            skeleton={<RunwaySkeleton />}
            widget={(() => {
              const parsed = parseOutput(part, runwaySchema);
              return parsed ? <RunwayWidget {...parsed} onAsk={onAsk} /> : null;
            })()}
            errorText={"errorText" in part ? part.errorText : undefined}
          />
        </div>
      );

    case "tool-show_generated_ui":
      return (
        <div key={key}>
          <ToolFrame
            state={part.state}
            skeleton={<GeneratedUiSkeleton />}
            widget={(() => {
              const parsed = parseOutput(part, generatedUiOutputSchema);
              if (!parsed) return null;
              if (!parsed.ok) {
                return <ToolError message={parsed.reason} />;
              }
              return <GeneratedUiWidget {...parsed} onRepair={onRepair} />;
            })()}
            errorText={"errorText" in part ? part.errorText : undefined}
          />
        </div>
      );

    default:
      return null;
  }
}
