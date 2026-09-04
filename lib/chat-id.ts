export const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isChatId(id: string) {
  return CHAT_ID_PATTERN.test(id);
}
