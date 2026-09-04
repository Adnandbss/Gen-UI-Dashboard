"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RevenueChartInput } from "@/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const revenue = Number(payload.find((p) => p.dataKey === "revenue")?.value ?? 0);
  const expenses = Number(payload.find((p) => p.dataKey === "expenses")?.value ?? 0);
  const net = revenue - expenses;

  return (
    <div className="bg-popover/95 min-w-44 rounded-lg border p-3 shadow-xl backdrop-blur-sm">
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <dl className="tabular space-y-1.5 text-sm">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <dt className="text-muted-foreground flex-1">{entry.name}</dt>
            <dd className="font-medium">{formatCurrency(Number(entry.value ?? 0))}</dd>
          </div>
        ))}
        <div className="mt-1.5 flex items-center gap-2 border-t pt-1.5">
          <dt className="text-muted-foreground flex-1 pl-4">Net</dt>
          <dd
            className={cn(
              "font-semibold",
              net >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
            )}
          >
            {formatCurrency(net)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function RevenueChartWidget({
  data,
  title = "Revenue vs. Expenses",
  subtitle,
}: RevenueChartInput) {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const net = totalRevenue - totalExpenses;
  const margin = totalRevenue === 0 ? 0 : (net / totalRevenue) * 100;
  const marginIsUp = margin >= 0;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {subtitle ?? `${data.length} ${data.length === 1 ? "period" : "periods"}`}
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="tabular text-2xl font-semibold tracking-tight">
            {formatCurrency(net)}
          </p>
          <p
            className={cn(
              "mt-0.5 flex items-center justify-end gap-1 text-xs font-medium",
              marginIsUp ? "text-[var(--positive)]" : "text-[var(--negative)]",
            )}
          >
            {marginIsUp ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            <span className="tabular">{margin.toFixed(1)}% margin</span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={4}
            >
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
                cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                content={<ChartTooltip />}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-4 border-t px-4 pt-4 sm:px-2">
          {[
            { label: "Revenue", value: totalRevenue },
            { label: "Expenses", value: totalExpenses },
            { label: "Net", value: net },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="tabular mt-0.5 text-sm font-medium">
                {formatCurrency(item.value)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
