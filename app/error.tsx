"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium tracking-tight">Something went wrong</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        The dashboard failed to load. Try again — if it keeps happening, restart
        the dev server.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border px-3 py-1.5 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
