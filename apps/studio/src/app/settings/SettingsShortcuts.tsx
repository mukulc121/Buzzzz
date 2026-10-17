import { settingsShortcuts } from "../../features/settings/shortcutDisplay";

const shortcuts = settingsShortcuts(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
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
