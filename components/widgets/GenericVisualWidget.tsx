"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthsFilter, VisualView } from "@/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RangeChips } from "@/components/widgets/RangeChips";
import { formatCompact, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
] as const;

type ChartPoint = Record<string, string | number>;

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

function isCount(yKey: string) {
  return yKey === "id";
}

function formatMeasure(yKey: string, value: number) {
  return isCount(yKey) ? String(value) : formatCurrency(value);
}

function ChartTooltip({
  yKey,
  active,
  payload,
  label,
}: {
  yKey: string;
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

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
            <dt className="text-muted-foreground flex-1">
              {String(entry.name ?? entry.dataKey)}
            </dt>
            <dd className="font-medium">
              {formatMeasure(yKey, Number(entry.value ?? 0))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function pivotRows(view: VisualView) {
  if (!view.seriesKey) {
    return {
      data: view.rows.map((row) => ({ x: row.x, y: row.y })),
      seriesKeys: ["y"] as string[],
    };
  }

  const seriesKeys = [...new Set(view.rows.map((row) => row.series ?? "Series"))];
  const categories = [...new Set(view.rows.map((row) => row.x))];
  const data = categories.map((x) => {
    const point: ChartPoint = { x };
    for (const key of seriesKeys) {
      const match = view.rows.find(
        (row) => row.x === x && (row.series ?? "Series") === key,
      );
      point[key] = match?.y ?? 0;
    }
    return point;
  });
  return { data, seriesKeys };
}

function xFromClick(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { payload?: { x?: unknown }; x?: unknown; name?: unknown };
  const value = record.payload?.x ?? record.x ?? record.name;
  return typeof value === "string" ? value : "";
}

export function GenericVisualWidget({
  title = "Visual",
  subtitle,
  mark,
  xKey,
  yKey,
  seriesKey,
  months,
  rows,
  onAsk,
}: VisualView & { onAsk?: (prompt: string) => void }) {
  const { data, seriesKeys } = pivotRows({
    unsupported: false,
    title,
    subtitle,
    mark,
    xKey,
    yKey,
    seriesKey,
    months,
    rows,
  });
  const total = rows.reduce((sum, row) => sum + row.y, 0);
  const yLabel = yKey === "id" ? "Count" : yKey;
  const showLegend = Boolean(seriesKey) || mark === "pie";

  const askAbout = (xValue: string) => {
    if (!xValue) return;
    onAsk?.(`Break down ${xValue} in ${title}.`);
  };

  return (
    <Card className="w-full overflow-hidden" aria-label={`${title}: ${yKey} by ${xKey}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {subtitle ?? `${rows.length} ${rows.length === 1 ? "value" : "values"}`}
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
          {onAsk && months && (
            <RangeChips
              activeMonths={months}
              onSelect={(next: MonthsFilter) =>
                onAsk(`Show ${title} for the last ${next} months.`)
              }
            />
          )}
          <p className="tabular text-2xl font-semibold tracking-tight">
            {formatMeasure(
              yKey,
              mark === "pie" ? total : (rows.at(-1)?.y ?? total),
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {mark === "pie"
              ? "Total of slices"
              : mark === "area" || mark === "line"
                ? "Latest point"
                : isCount(yKey)
                  ? "Count"
                  : "Latest value"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {mark === "pie" ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="y"
                  nameKey="x"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={100}
                  paddingAngle={2}
                  onClick={(slice) => askAbout(xFromClick(slice))}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={String(entry.x)}
                      fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                      className={cn(onAsk && "cursor-pointer")}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip yKey={yKey} />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            ) : mark === "line" ? (
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={10} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value: number) => isCount(yKey) ? String(value) : formatCompact(value)} />
                <Tooltip content={<ChartTooltip yKey={yKey} />} />
                {showLegend ? (
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                ) : null}
                {seriesKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key === "y" ? yLabel : key}
                    stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            ) : mark === "area" ? (
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={10} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value: number) => isCount(yKey) ? String(value) : formatCompact(value)} />
                <Tooltip content={<ChartTooltip yKey={yKey} />} />
                {seriesKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key === "y" ? yLabel : key}
                    stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                    fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                    fillOpacity={0.2}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={10} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value: number) => isCount(yKey) ? String(value) : formatCompact(value)} />
                <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.5 }} content={<ChartTooltip yKey={yKey} />} />
                {(mark === "grouped_bar" || seriesKey) && (
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                )}
                {seriesKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key === "y" ? yLabel : key}
                    fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    className={cn(onAsk && "cursor-pointer")}
                    onClick={(bar) => askAbout(xFromClick(bar))}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
