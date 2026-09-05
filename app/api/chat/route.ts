import { createGoogle } from "@ai-sdk/google";
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
import { isChatId } from "@/lib/chat-id";
import { saveChat } from "@/lib/chat-store";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEFAULT_OPENAI_MODEL = "openai/gpt-5.6-sol";
const DEFAULT_GOOGLE_MODEL = "google/gemini-3.6-flash";

function env(name: string) {
  return process.env[name];
}

function googleApiKey() {
  return env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GEMINI_API_KEY");
}

/** True when nothing is configured to talk to a real provider. */
function isDemoMode() {
  // OIDC is injected by `vercel link` / `vercel pull` even without a model
  // provider. Treat only explicit provider keys as "go live".
  return !(
    env("OPENAI_API_KEY") ||
    env("AI_GATEWAY_API_KEY") ||
    googleApiKey()
  );
}

function stripProvider(modelId: string, provider: "openai" | "google") {
  return modelId.replace(new RegExp(`^${provider}/`), "");
}

/**
 * Ways to run, in priority order:
 *
 * 1. `OPENAI_API_KEY` — talk to OpenAI directly.
 * 2. `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` — Google AI Studio.
 * 3. `AI_GATEWAY_API_KEY` — route a `provider/model` slug through the Vercel
 *    AI Gateway.
 * 4. Neither — scripted demo model so a fresh clone still works.
 */
function resolveModel() {
  if (isDemoMode()) return demoModel;

  const requested = env("CHAT_MODEL");

  if (env("OPENAI_API_KEY")) {
    const modelId = requested ?? DEFAULT_OPENAI_MODEL;
    return openai(stripProvider(modelId, "openai"));
  }

  if (googleApiKey()) {
    const modelId =
      !requested || requested.startsWith("openai/")
        ? DEFAULT_GOOGLE_MODEL
        : requested;
    return createGoogle({ apiKey: googleApiKey() })(
      stripProvider(modelId, "google"),
    );
  }

  return requested ?? DEFAULT_OPENAI_MODEL;
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(clientIp(req));
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests. Try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfter) },
      },
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const payload = body as { messages?: ChatMessage[]; id?: string };
  const messages = payload.messages;
  const id = typeof payload.id === "string" ? payload.id : "";

  if (!Array.isArray(messages)) {
    return Response.json(
      { error: "Expected a { messages } array." },
      { status: 400 },
    );
  }

  if (!isChatId(id)) {
    return Response.json({ error: "Invalid chat id." }, { status: 400 });
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
      originalMessages: messages,
      onError: (error) => {
        console.error("[chat] stream error", error);
        return error instanceof Error
          ? error.message
          : "Something went wrong while generating a response.";
      },
      onEnd: async ({ messages: nextMessages }) => {
        if (nextMessages.some((message) => message.role === "user")) {
          await saveChat(id, nextMessages);
        }
      },
    }),
  });
}

/** Lets the client show an honest "demo mode" badge in the header. */
export async function GET() {
  return Response.json({ demoMode: isDemoMode() });
}
