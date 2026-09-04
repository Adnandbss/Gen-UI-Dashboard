"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthsFilter, RunwayInput } from "@/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RangeChips } from "@/components/widgets/RangeChips";
import { formatCompact, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const cash = Number(payload.find((p) => p.dataKey === "cash")?.value ?? 0);
  const runway = Number(
    payload.find((p) => p.dataKey === "runwayMonths")?.value ?? 0,
  );

  return (
    <div className="bg-popover/95 min-w-44 rounded-lg border p-3 shadow-xl backdrop-blur-sm">
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <dl className="tabular space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Cash</dt>
          <dd className="font-medium">{formatCurrency(cash)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Runway</dt>
          <dd className="font-medium">{runway.toFixed(1)} mo</dd>
        </div>
      </dl>
    </div>
  );
}

export function RunwayWidget({
  data,
  title = "Cash runway",
  subtitle,
  monthsOfRunway,
  cashOnHand,
  netBurn,
  onAsk,
}: RunwayInput & { onAsk?: (prompt: string) => void }) {
  const extending = data.length > 1 && data[data.length - 1]!.runwayMonths >= data[0]!.runwayMonths;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {subtitle ?? `${data.length} ${data.length === 1 ? "period" : "periods"}`}
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
          {onAsk && (
            <RangeChips
              activeMonths={
                data.length === 3 || data.length === 6 || data.length === 12
                  ? data.length
                  : undefined
              }
              onSelect={(months: MonthsFilter) =>
                onAsk(`Show cash runway for the last ${months} months.`)
              }
            />
          )}
          <div className="text-right">
            <p className="tabular text-2xl font-semibold tracking-tight">
              {monthsOfRunway.toFixed(0)} months
            </p>
            <p
              className={cn(
                "mt-0.5 flex items-center justify-end gap-1 text-xs font-medium",
                extending ? "text-[var(--positive)]" : "text-[var(--negative)]",
              )}
            >
              {extending ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              <span className="tabular">
                {formatCurrency(cashOnHand)} cash · {formatCurrency(netBurn)}/mo burn
              </span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="runwayCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(value: number) => formatCompact(value)}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={<ChartTooltip />}
              />
              <Area
                type="monotone"
                dataKey="cash"
                name="Cash"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#runwayCash)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
