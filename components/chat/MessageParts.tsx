"use client";

import { AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { ChatMessage } from "@/ai/types";
import {
  kpiMetricsSchema,
  revenueChartSchema,
  transactionsListSchema,
} from "@/ai/schemas";
import { KpiCardsWidget } from "@/components/widgets/KpiCardsWidget";
import { TransactionsGridWidget } from "@/components/widgets/TransactionsGridWidget";
import {
  KpiCardsSkeleton,
  RevenueChartSkeleton,
  TransactionsSkeleton,
} from "@/components/widgets/widget-skeletons";

const RevenueChartWidget = dynamic(
  () =>
    import("@/components/widgets/RevenueChartWidget").then(
      (mod) => mod.RevenueChartWidget,
    ),
  { ssr: false, loading: () => <RevenueChartSkeleton /> },
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
}: {
  parts: ChatMessage["parts"];
  messageId: string;
}) {
  return (
    <>
      {parts.map((part, index) => renderPart(part, `${messageId}-${index}`))}
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
      return skeleton;
    case "input-available":
    case "output-available":
      return widget ? <div className="animate-rise">{widget}</div> : skeleton;
    case "output-error":
      return <ToolError message={errorText ?? "This widget failed to render."} />;
    default:
      return null;
  }
}

function renderPart(part: MessagePart, key: string) {
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
              const parsed = revenueChartSchema.safeParse(part.input);
              return parsed.success ? (
                <RevenueChartWidget {...parsed.data} />
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
              const parsed = transactionsListSchema.safeParse(part.input);
              return parsed.success ? (
                <TransactionsGridWidget {...parsed.data} />
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
              const parsed = kpiMetricsSchema.safeParse(part.input);
              return parsed.success ? (
                <KpiCardsWidget {...parsed.data} />
              ) : null;
            })()}
            errorText={"errorText" in part ? part.errorText : undefined}
          />
        </div>
      );

    default:
      return null;
  }
}
