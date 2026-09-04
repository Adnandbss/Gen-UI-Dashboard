export type PromptChip = {
  label: string;
  prompt: string;
};

export const STARTER_PROMPTS: PromptChip[] = [
  {
    label: "Full dashboard",
    prompt: "Give me the full dashboard for August.",
  },
  {
    label: "Revenue trend",
    prompt: "How did revenue trend against expenses over the last 6 months?",
  },
  {
    label: "Recent activity",
    prompt: "Show me the most recent transactions.",
  },
  {
    label: "Pending items",
    prompt: "What payments are still pending?",
  },
];

export const NAV_PROMPTS: Record<string, string> = {
  Overview: "Give me the full dashboard for August.",
  Revenue: "How did revenue trend against expenses over the last 6 months?",
  Transactions: "Show me the most recent transactions.",
  Accounts: "Show me the most recent transactions.",
  Reports: "Give me the full dashboard for August.",
  Settings:
    "What can I configure in this workspace?",
};

/**
 * Contextual next questions after a reply, so the conversation doesn't dead-end
 * on a finished widget.
 */
export function followUpsFor(userText: string): PromptChip[] {
  const text = userText.toLowerCase();

  if (/runway|cash on hand/.test(text)) {
    return [
      {
        label: "12-month runway",
        prompt: "Show cash runway for the last 12 months.",
      },
      {
        label: "Full dashboard",
        prompt: "Give me the full dashboard for August.",
      },
    ];
  }

  if (/pending|outstanding|unsettled/.test(text)) {
    return [
      {
        label: "Full ledger",
        prompt: "Show me the most recent transactions.",
      },
      {
        label: "August overview",
        prompt: "Give me the full dashboard for August.",
      },
    ];
  }

  if (/churn/.test(text)) {
    return [
      {
        label: "Revenue trend",
        prompt: "How did revenue trend against expenses over the last 6 months?",
      },
      {
        label: "Pending items",
        prompt: "What payments are still pending?",
      },
    ];
  }

  if (/burn/.test(text) && !/dashboard|full/.test(text)) {
    return [
      {
        label: "What is burn multiple?",
        prompt: "What is a burn multiple?",
      },
      {
        label: "Full dashboard",
        prompt: "Give me the full dashboard for August.",
      },
    ];
  }

  if (/transaction|payment|ledger|activity/.test(text)) {
    return [
      {
        label: "Pending only",
        prompt: "What payments are still pending?",
      },
      {
        label: "Revenue trend",
        prompt: "How did revenue trend against expenses over the last 6 months?",
      },
    ];
  }

  if (/revenue|expense|chart|trend|month/.test(text) && !/dashboard|full/.test(text)) {
    return [
      {
        label: "Headline KPIs",
        prompt: "Give me a snapshot of how we are doing.",
      },
      {
        label: "Recent activity",
        prompt: "Show me the most recent transactions.",
      },
    ];
  }

  return [
    {
      label: "Pending items",
      prompt: "What payments are still pending?",
    },
    {
      label: "Churn by segment",
      prompt: "How is churn looking by segment?",
    },
  ];
}

export function lastUserText(
  messages: { role: string; parts: { type: string; text?: string }[] }[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("");
  }
  return "";
}
