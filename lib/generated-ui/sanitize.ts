/**
 * The generated component is a string the model wrote. We never eval it on the
 * server. We do strip markdown fences (models wrap anyway) and refuse sources
 * that would reach the network or eval themselves inside the iframe.
 */

const FENCED = /^```(?:jsx|tsx|javascript|js|ts)?\s*\n?([\s\S]*?)\n?```$/;

const FORBIDDEN =
  /\b(?:fetch|XMLHttpRequest|eval|Function|importScripts|WebSocket)\s*\(|\bnew\s+Function\b/;

export function stripMarkdownFences(source: string) {
  const trimmed = source.trim();
  const match = trimmed.match(FENCED);
  return (match?.[1] ?? trimmed).trim();
}

export function sanitizeGeneratedCode(
  source: string,
): { ok: true; code: string } | { ok: false; reason: string } {
  const code = stripMarkdownFences(source);
  if (!code) {
    return { ok: false, reason: "Generated component source was empty." };
  }
  if (FORBIDDEN.test(code)) {
    return {
      ok: false,
      reason:
        "Generated components cannot call fetch, eval, or open sockets. Read data.rows only.",
    };
  }
  return { ok: true, code };
}
