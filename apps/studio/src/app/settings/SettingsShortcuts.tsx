const command = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl+";
const shortcuts = [
  ["Undo", `${command}Z`],
  ["Redo", `⇧${command}Z`],
  ["Copy", `${command}C`],
  ["Paste", `${command}V`],
  ["Delete selection", "⌫"],
  ["Select active layer", `${command}A`],
  ["Zoom in", "+"],
  ["Zoom out", "−"],
  ["Move left", "←"],
  ["Move right", "→"],
  ["Clear selection", "Esc"],
  ["Play / stop", "P"],
  ["Add marker at the cursor", "M"],
  ["Intensity layer", "1"],
  ["Frequency layer", "2"],
  ["Discrete layer", "3"],
] as const;
const gestures = [
  ["Add event or point", "Double-click"],
  ["Add to selection", "Shift-click"],
  ["Marquee selection", "Drag"],
  ["Pan chart", "Alt-drag"],
  ["Zoom chart", "Wheel"],
] as const;
export function SettingsShortcuts() {
  return (
    <>
      <ul className="settings-shortcuts">
        {shortcuts.map(([label, keys]) => (
          <li key={label}>
            <span>{label}</span>
            <kbd>{keys}</kbd>
          </li>
        ))}
      </ul>
      <p className="settings-subheading">Mouse</p>
      <ul className="settings-shortcuts">
        {gestures.map(([label, keys]) => (
          <li key={label}>
            <span>{label}</span>
            <kbd>{keys}</kbd>
          </li>
        ))}
      </ul>
    </>
  );
}
