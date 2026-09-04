import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";

import { demoModel } from "@/ai/demo-model";
import { SYSTEM_PROMPT } from "@/ai/prompt";
import { chatTools } from "@/ai/tools";
import type { ChatMessage } from "@/ai/types";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "openai/gpt-5.6-sol";

/** True when nothing is configured to talk to a real provider. */
function isDemoMode() {
  // OIDC is injected by `vercel link` / `vercel pull` even without a model
  // provider. Treat only explicit provider keys as "go live".
  return !(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY);
}

/**
 * Three ways to run, in priority order:
 *
 * 1. `OPENAI_API_KEY` — talk to OpenAI directly.
 * 2. `AI_GATEWAY_API_KEY` / Vercel OIDC — route the plain `provider/model`
 *    string through the Vercel AI Gateway, which handles failover and cost
 *    tracking and lets `CHAT_MODEL` point at any provider without a code change.
 * 3. Neither — fall back to the scripted demo model so the app is still
 *    explorable on a fresh clone.
 */
function resolveModel() {
  if (isDemoMode()) return demoModel;

  const modelId = process.env.CHAT_MODEL ?? DEFAULT_MODEL;

  if (process.env.OPENAI_API_KEY) {
    return openai(modelId.replace(/^openai\//, ""));
  }

  return modelId;
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const messages = (body as { messages?: ChatMessage[] }).messages;

  if (!Array.isArray(messages)) {
    return Response.json(
      { error: "Expected a { messages } array." },
      { status: 400 },
    );
  }

  const result = streamText({
    model: resolveModel(),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    // Enough steps for the model to render several widgets and then come back
    // with a written read on them.
    stopWhen: isStepCount(4),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("[chat] stream error", error);
        return error instanceof Error
          ? error.message
          : "Something went wrong while generating a response.";
      },
    }),
  });
}

/** Lets the client show an honest "demo mode" badge in the header. */
export async function GET() {
  return Response.json({ demoMode: isDemoMode() });
}
