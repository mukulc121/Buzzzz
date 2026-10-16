import { expect, test } from "bun:test";
import {
  copyPatternInto,
  editedAgo,
  freePresetId,
  newRecord,
  patternCount,
  starterProject,
  summarize,
} from "../src/features/project/model";
import { readPatternDrag, writePatternDrag } from "../src/features/project/dashboard/patternDrag";

test("card meta matches Pulsar wording", () => {
  const now = Date.UTC(2026, 9, 16, 12);
  expect([0, 1, 4].map(patternCount)).toEqual(["No patterns", "1 pattern", "4 patterns"]);
  expect(editedAgo(now - 30_000, now)).toBe("just now");
  expect(editedAgo(now - 12 * 60_000, now)).toBe("12 min ago");
  expect(editedAgo(now - 3 * 3_600_000, now)).toBe("3 hr ago");
  expect(editedAgo(now - 30 * 3_600_000, now)).toBe("yesterday");
  expect(editedAgo(now - 3 * 86_400_000, now)).toBe("3 days ago");
  expect(editedAgo(Date.UTC(2026, 0, 2, 12), now)).toBe("Jan 2, 2026");
});

test("summaries carry the first five patterns for previews", () => {
  const project = starterProject();
  const base = project.presets[0]!;
  project.presets = Array.from({ length: 7 }, (_, index) => ({ ...base, id: `p${index}` }));
  const summary = summarize(newRecord("Seven", project));
  expect(summary.patterns).toBe(7);
  expect(summary.previews.map((preset) => preset.id)).toEqual(["p0", "p1", "p2", "p3", "p4"]);
});

test("a copied pattern keeps its editor data under a free id", () => {
  const target = starterProject();
  const source = { ...target.presets[0]!, editor: { markers: [], range: null, durationMs: 900 } };
  const id = freePresetId(target, source.id);
  expect(id).not.toBe(source.id);
  const copied = copyPatternInto(target, source, id).presets.at(-1)!;
  expect(copied).toEqual({ ...source, id });
  expect(freePresetId(target, "unused")).toBe("unused");
});

test("pattern drags round-trip and reject foreign payloads", () => {
  const store = new Map<string, string>();
  const data = {
    effectAllowed: "none",
    get types() {
      return [...store.keys()];
    },
    setData: (type: string, value: string) => void store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
  } as unknown as DataTransfer;
  writePatternDrag(data, { sourceProjectId: "a", presetId: "b" });
  expect(data.effectAllowed).toBe("copy");
  expect(readPatternDrag(data)).toEqual({ sourceProjectId: "a", presetId: "b" });
  store.set(data.types[0]!, JSON.stringify({ sourceProjectId: 1 }));
  expect(readPatternDrag(data)).toBeNull();
});
