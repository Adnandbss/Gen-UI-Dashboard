"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import type { Transaction, TransactionsListInput } from "@/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: Transaction["status"] }) {
  const completed = status === "Completed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        completed
          ? "border-[var(--positive)]/25 text-[var(--positive)]"
          : "border-amber-500/25 text-amber-500",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          completed ? "bg-[var(--positive)]" : "bg-amber-500",
        )}
      />
      {status}
    </span>
  );
}

export function TransactionsGridWidget({
  transactions,
  title = "Recent Transactions",
}: TransactionsListInput) {
  const netFlow = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card className="w-full gap-0 overflow-hidden pb-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-6">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {transactions.length}{" "}
            {transactions.length === 1 ? "entry" : "entries"}
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Net flow</p>
          <p
            className={cn(
              "tabular mt-0.5 text-sm font-semibold",
              netFlow >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
            )}
          >
            {formatCurrency(netFlow)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {/* Horizontal scroll keeps the table honest on narrow screens instead of
            letting descriptions collapse into unreadable slivers. */}
        <div className="scrollbar-subtle w-full overflow-x-auto border-t">
          {/* table-fixed + explicit widths so the amount column can never be
              pushed off the edge by a long description — the description
              truncates instead. */}
          <table className="w-full min-w-[600px] table-fixed text-sm">
            <caption className="sr-only">{title}</caption>
            <colgroup>
              <col className="w-32" />
              <col />
              <col className="w-32" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                <th scope="col" className="py-3 pr-3 pl-6 text-left font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-3 text-left font-medium">
                  Description
                </th>
                <th scope="col" className="px-3 py-3 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="py-3 pr-6 pl-3 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {transactions.map((transaction) => {
                const isCredit = transaction.amount >= 0;
                return (
                  <tr
                    key={transaction.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="text-muted-foreground tabular py-3.5 pr-3 pl-6 whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full",
                            isCredit
                              ? "bg-[var(--positive)]/12 text-[var(--positive)]"
                              : "bg-[var(--negative)]/12 text-[var(--negative)]",
                          )}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="size-3.5" />
                          ) : (
                            <ArrowUpRight className="size-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {transaction.description}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {transaction.id}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={transaction.status} />
                    </td>
                    <td
                      className={cn(
                        "tabular py-3.5 pr-6 pl-3 text-right font-medium whitespace-nowrap",
                        isCredit
                          ? "text-[var(--positive)]"
                          : "text-[var(--negative)]",
                      )}
                    >
                      {formatSignedCurrency(transaction.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
