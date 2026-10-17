import { expect, test } from "bun:test";
import { emptyPattern, isProject } from "../src/index.ts";
test("project editor metadata validates bounded markers, spans and playback ranges", () => {
  const preset = {
    id: "test",
    name: "Test",
    pattern: emptyPattern(),
    editor: {
      markers: [{ id: "beat", label: "Beat", time: 100 }],
      range: { start: 20, end: 400 },
      durationMs: 500,
    },
  };
  expect(isProject({ presets: [preset], map: {} })).toBe(true);
  for (const editor of [
    { ...preset.editor, range: { start: 400, end: 20 } },
    { ...preset.editor, durationMs: Infinity },
    { ...preset.editor, markers: [...preset.editor.markers, ...preset.editor.markers] },
    { ...preset.editor, markers: [{ id: "beat", label: "Beat", time: -1 }] },
  ])
    expect(isProject({ presets: [{ ...preset, editor }], map: {} })).toBe(false);
});
