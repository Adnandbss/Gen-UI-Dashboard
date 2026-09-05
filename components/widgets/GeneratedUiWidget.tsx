"use client";

import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { AlertTriangle, Code2 } from "lucide-react";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";

import type { GeneratedUiView } from "@/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SILENT_REPAIRS = 2;

function formatSandpackError(error: { message?: string; title?: string } | string) {
  if (typeof error === "string") return error;
  return [error.title, error.message].filter(Boolean).join(": ") || "Generated view failed to render.";
}

class HostErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(`${error.message}\n${info.componentStack ?? ""}`);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function RuntimeErrorBridge({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const { sandpack } = useSandpack();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!sandpack.error) return;
    const message = formatSandpackError(sandpack.error);
    const timer = window.setTimeout(() => {
      if (last.current === message) return;
      last.current = message;
      onError(message);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [sandpack.error, onError]);

  return null;
}

function buildAppSource(data: GeneratedUiView["data"]) {
  return `import Chart from "./Chart";

const data = ${JSON.stringify(data)};

export default function App() {
  return (
    <div className="min-h-screen bg-white p-4">
      <Chart data={data} />
    </div>
  );
}
`;
}

export function GeneratedUiWidget({
  code,
  data,
  onRepair,
}: GeneratedUiView & {
  onRepair?: (stack: string, dataset: "monthly_pl" | "transactions") => void;
}) {
  const [showCode, setShowCode] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const attempts = useRef(0);

  const files = useMemo(
    () => ({
      "/Chart.jsx": code,
      "/App.js": buildAppSource(data),
    }),
    [code, data],
  );

  const handleError = useCallback(
    (message: string) => {
      if (fatal || repairing) return;
      if (attempts.current >= MAX_SILENT_REPAIRS) {
        setFatal(message);
        return;
      }
      attempts.current += 1;
      setRepairing(true);
      onRepair?.(message, data.dataset);
    },
    [data.dataset, fatal, onRepair, repairing],
  );

  if (fatal) {
    return (
      <div
        role="alert"
        className={cn(
          "text-destructive bg-destructive/8 border-destructive/25 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm",
        )}
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{fatal}</span>
      </div>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Generated view</CardTitle>
          <CardDescription>
            {repairing
              ? "Adjusting layout…"
              : data.dataset === "monthly_pl"
                ? "Monthly P&L from the warehouse"
                : "Ledger rows from the warehouse"}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCode((open) => !open)}
          aria-pressed={showCode}
        >
          <Code2 className="size-3.5" />
          Code
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-0">
        <HostErrorBoundary onError={handleError}>
          <SandpackProvider
            template="react"
            theme="light"
            files={files}
            customSetup={{
              dependencies: {
                recharts: "3.10.1",
                "lucide-react": "1.40.0",
              },
            }}
            options={{
              externalResources: ["https://cdn.tailwindcss.com"],
              visibleFiles: ["/Chart.jsx"],
              activeFile: "/Chart.jsx",
              initMode: "immediate",
            }}
          >
            <RuntimeErrorBridge onError={handleError} />
            <SandpackLayout className="!rounded-none !border-0">
              {showCode ? (
                <SandpackCodeEditor
                  showLineNumbers
                  showTabs={false}
                  wrapContent
                  style={{ height: 360 }}
                />
              ) : null}
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                showSandpackErrorOverlay={!repairing}
                style={{ height: 360, flex: 1 }}
              />
            </SandpackLayout>
          </SandpackProvider>
        </HostErrorBoundary>
      </CardContent>
    </Card>
  );
}
