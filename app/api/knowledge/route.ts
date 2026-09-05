import { isChatId } from "@/lib/chat-id";
import {
  assertFileSize,
  classifyFilename,
  parseKnowledgeFile,
} from "@/lib/knowledge/parse";
import { insertParsedSources, listKnowledge } from "@/lib/knowledge/store";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const chatId = new URL(req.url).searchParams.get("chatId") ?? "";
  if (!isChatId(chatId)) {
    return jsonError("Invalid chat id.", 400);
  }

  const sources = await listKnowledge(chatId);
  return Response.json({ sources });
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected multipart form data.", 400);
  }

  const chatId = String(form.get("chatId") ?? "");
  if (!isChatId(chatId)) {
    return jsonError("Invalid chat id.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Attach a file.", 400);
  }

  try {
    assertFileSize(file.size);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "File is too large.",
      400,
    );
  }

  if (classifyFilename(file.name) === "unknown") {
    return jsonError("Use a CSV, Excel, or PDF file.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const parsed = await parseKnowledgeFile(buffer, file.name);
    const sources = await insertParsedSources(chatId, parsed);
    return Response.json({ sources });
  } catch (error) {
    console.error("[knowledge] parse failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not read that file.",
      400,
    );
  }
}
