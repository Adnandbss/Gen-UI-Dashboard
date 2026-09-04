import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the model is still streaming a tool's arguments. Each skeleton
 * matches the footprint of the widget it stands in for, so the chat transcript
 * doesn't jump when the real component swaps in.
 */

const BAR_HEIGHTS = [58, 74, 46, 88, 66, 80];

export function RevenueChartSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-[280px] items-end gap-4">
          {BAR_HEIGHTS.map((height, index) => (
            // h-full is load-bearing: the percentage bar heights below resolve
            // against this element, and an auto-height parent collapses them to 0.
            <div key={index} className="flex h-full flex-1 items-end gap-1.5">
              <Skeleton className="w-full" style={{ height: `${height}%` }} />
              <Skeleton
                className="w-full"
                style={{ height: `${height * 0.6}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TransactionsSkeleton() {
  return (
    <Card className="w-full gap-0 pb-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent className="space-y-px border-t px-6 pt-4 pb-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="gap-0 py-5">
          <CardHeader className="px-5 pb-2">
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent className="px-5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
