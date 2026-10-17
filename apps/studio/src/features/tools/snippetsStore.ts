import { isPattern, isRecord, type Pattern } from "@buzzzz/core";

export interface ISnippet {
  id: string;
  name: string;
  pattern: Pattern;
  durationMs: number;
}
const KEY = "buzzzz.snippets.v1";

export function loadSnippets(): ISnippet[] {
  try {
    const text = localStorage.getItem(KEY);
    if (!text || text.length > 1024 * 1024) return [];
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    const snippets: ISnippet[] = [];
    for (const item of data) {
      if (
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        item.name.length <= 80 &&
        typeof item.durationMs === "number" &&
        Number.isFinite(item.durationMs) &&
        item.durationMs >= 0 &&
        item.durationMs <= 60000 &&
        isPattern(item.pattern)
      )
        snippets.push({
          id: item.id,
          name: item.name,
          durationMs: item.durationMs,
          pattern: item.pattern,
        });
    }
    return snippets;
  } catch {
    return [];
  }
}

export function saveSnippets(snippets: ISnippet[]): void {
  const text = JSON.stringify(snippets);
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024)
    throw new Error("Local snippets exceed 1 MiB");
  localStorage.setItem(KEY, text);
  window.dispatchEvent(new Event("buzzzz:snippets-changed"));
}
