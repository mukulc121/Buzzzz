import { expect, test } from "bun:test";
import { settingsShortcuts } from "../src/features/settings/shortcutDisplay";

test("settings key displays use the source platform modifiers and Delete glyph", () => {
  for (const [apple, expected] of [
    [true, { "Save now": "⌘S", Undo: "⌘Z", Redo: "⇧⌘Z", "Delete selection": "⌦" }],
    [
      false,
      { "Save now": "Ctrl+S", Undo: "Ctrl+Z", Redo: "Ctrl+Shift+Z", "Delete selection": "Del" },
    ],
  ] satisfies [boolean, Record<string, string>][]) {
    const shortcuts = Object.fromEntries(settingsShortcuts(apple));
    expect(settingsShortcuts(apple)[0]).toEqual(["Save now", expected["Save now"]]);
    expect(shortcuts).toMatchObject({
      ...expected,
      "Zoom out": "-",
      "Cancel paste or clear selection": "Esc",
      "Activate Intensity": "1",
      "Activate Frequency": "2",
      "Activate Discrete": "3",
    });
  }
});
