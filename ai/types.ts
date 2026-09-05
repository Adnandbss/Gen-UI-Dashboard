import type { InferUITools, UIMessage } from "ai";

import type { chatTools } from "./tools";

/**
 * Type-only module: importing this from a client component costs nothing at
 * runtime, but gives `useChat` full knowledge of every tool part — so
 * `part.output` is strongly typed at each render site instead of `unknown`.
 */
export type ChatTools = InferUITools<typeof chatTools>;

export type ChatMetadata = { silent?: boolean };

export type ChatMessage = UIMessage<ChatMetadata, never, ChatTools>;
