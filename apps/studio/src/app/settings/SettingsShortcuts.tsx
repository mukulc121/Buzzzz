import { settingsShortcuts } from "../../features/settings/shortcutDisplay";

const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const shortcuts = settingsShortcuts(isApple);
const gestures = [
  ["Add a point on the active layer", "Double-click"],
  ["Marquee-select", "Drag"],
  ["Move a point", "Drag a point"],
  ["Pan", "Middle-drag"],
  ["Scroll through time", "Wheel"],
  ["Zoom at the pointer", `${isApple ? "⌘" : "Ctrl"} + wheel`],
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
