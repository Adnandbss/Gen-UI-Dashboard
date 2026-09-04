import type {
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { planDemoResponse } from "./demo-data";

/**
 * A stand-in language model used when no provider credentials are configured.
 *
 * It speaks the same provider protocol as a real model — streaming tool inputs
 * chunk by chunk, then emitting the tool call — so every downstream layer
 * (streamText, the UI message stream, the `input-streaming` skeletons) behaves
 * exactly as it does in production. The only thing that changes is where the
 * tokens come from.
 */

const TEXT_CHUNK_SIZE = 6;
const JSON_CHUNK_SIZE = 48;

function chunkString(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

function lastUserText(prompt: LanguageModelV4CallOptions["prompt"]): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role !== "user") continue;
    return message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join(" ");
  }
  return "";
}

const usage = {
  inputTokens: {
    total: 0,
    noCache: 0,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
} as const;

function textParts(id: string, text: string): LanguageModelV4StreamPart[] {
  return [
    { type: "text-start", id },
    ...chunkString(text, TEXT_CHUNK_SIZE).map(
      (delta): LanguageModelV4StreamPart => ({ type: "text-delta", id, delta }),
    ),
    { type: "text-end", id },
  ];
}

function buildChunks(
  options: LanguageModelV4CallOptions,
): LanguageModelV4StreamPart[] {
  const plan = planDemoResponse(lastUserText(options.prompt));

  // A `tool` message in the prompt means the widgets already rendered and
  // streamText has looped back for the follow-up analysis.
  const isFollowUpStep = options.prompt.some(
    (message) => message.role === "tool",
  );

  if (isFollowUpStep) {
    return [
      ...textParts("demo-closing", plan.closing),
      { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
    ];
  }

  const chunks: LanguageModelV4StreamPart[] = [
    ...textParts("demo-intro", plan.intro),
  ];

  // A conceptual question is answered in prose, with nothing to render.
  if (plan.toolCalls.length === 0) {
    return [
      ...chunks,
      { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
    ];
  }

  plan.toolCalls.forEach((call, index) => {
    const id = `demo-call-${index}`;
    const input = JSON.stringify(call.input);

    chunks.push({ type: "tool-input-start", id, toolName: call.toolName });
    for (const delta of chunkString(input, JSON_CHUNK_SIZE)) {
      chunks.push({ type: "tool-input-delta", id, delta });
    }
    chunks.push({ type: "tool-input-end", id });
    chunks.push({
      type: "tool-call",
      toolCallId: id,
      toolName: call.toolName,
      input,
    });
  });

  chunks.push({
    type: "finish",
    finishReason: { unified: "tool-calls", raw: undefined },
    usage,
  });

  return chunks;
}

export const demoModel = new MockLanguageModelV4({
  doStream: async (options) => ({
    stream: simulateReadableStream({
      initialDelayInMs: 350,
      chunkDelayInMs: 18,
      chunks: buildChunks(options),
    }),
  }),
});
