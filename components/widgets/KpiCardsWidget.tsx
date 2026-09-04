"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import type { KpiMetricsInput } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCardsWidget({ metrics }: KpiMetricsInput) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric, index) => (
        <Card
          key={`${metric.title}-${index}`}
          className="group relative gap-0 overflow-hidden py-5 transition-colors hover:border-[var(--brand)]/40"
        >
          {/* Subtle accent bar that picks up the metric's direction. */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100",
              metric.isPositive
                ? "bg-[var(--positive)]"
                : "bg-[var(--negative)]",
            )}
          />
          <CardHeader className="px-5 pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <p className="tabular text-3xl font-semibold tracking-tight">
              {metric.value}
            </p>
            <p
              className={cn(
                "mt-2 flex items-center gap-1.5 text-xs font-medium",
                metric.isPositive
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]",
              )}
            >
              {metric.isPositive ? (
                <TrendingUp className="size-3.5 shrink-0" />
              ) : (
                <TrendingDown className="size-3.5 shrink-0" />
              )}
              <span>{metric.trend}</span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
