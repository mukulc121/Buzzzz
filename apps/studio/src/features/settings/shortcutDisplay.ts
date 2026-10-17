interface IShortcut {
  label: string;
  key: string;
  mod?: boolean;
  shift?: boolean;
}

const SHORTCUTS: readonly IShortcut[] = [
  { label: "Undo", key: "Z", mod: true },
  { label: "Redo", key: "Z", mod: true, shift: true },
  { label: "Copy", key: "C", mod: true },
  { label: "Paste", key: "V", mod: true },
  { label: "Delete selection", key: "Delete" },
  { label: "Select active layer", key: "A", mod: true },
  { label: "Zoom in", key: "+" },
  { label: "Zoom out", key: "-" },
  { label: "Move left", key: "←" },
  { label: "Move right", key: "→" },
  { label: "Cancel paste or clear selection", key: "Esc" },
  { label: "Play / stop", key: "P" },
  { label: "Add marker at the cursor", key: "M" },
  { label: "Activate Intensity", key: "1" },
  { label: "Activate Frequency", key: "2" },
  { label: "Activate Discrete", key: "3" },
];

export function settingsShortcuts(isApple: boolean) {
  return SHORTCUTS.map((shortcut) => {
    const key = shortcut.key === "Delete" ? (isApple ? "⌦" : "Del") : shortcut.key;
    const keys = isApple
      ? `${shortcut.shift ? "⇧" : ""}${shortcut.mod ? "⌘" : ""}${key}`
      : [shortcut.mod ? "Ctrl" : null, shortcut.shift ? "Shift" : null, key]
          .filter(Boolean)
          .join("+");
    return [shortcut.label, keys];
  });
}
