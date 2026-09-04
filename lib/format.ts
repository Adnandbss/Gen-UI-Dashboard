const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dayMonth = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** `$1.2K` — for dense axes where space is tight. */
export function formatCompact(value: number) {
  return compactCurrency.format(value);
}

/** `$1,240` — for headline figures. */
export function formatCurrency(value: number) {
  return fullCurrency.format(value);
}

/** `+$1,240.00` / `-$310.50` — signed, for ledger rows. */
export function formatSignedCurrency(value: number) {
  const formatted = preciseCurrency.format(Math.abs(value));
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

/**
 * Renders an ISO date as `Aug 14, 2026`, falling back to the raw string when the
 * model hands us something unparseable rather than showing "Invalid Date".
 */
export function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dayMonth.format(parsed);
}
