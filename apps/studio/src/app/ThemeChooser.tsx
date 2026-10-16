import type { KeyboardEvent } from "react";
import type { Theme } from "./useTheme";

interface IThemeChooser {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
const THEMES = [
  { id: "system", icon: "monitor", label: "System" },
  { id: "light", icon: "sun", label: "Light" },
  { id: "dark", icon: "moon", label: "Dark" },
] as const;
export function ThemeChooser(props: IThemeChooser) {
  const { theme, setTheme } = props;
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const next = THEMES[(index + direction + THEMES.length) % THEMES.length];
    setTheme(next.id);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[aria-label="${next.label}"]`)
      ?.focus();
  };
  return (
    <div className="theme-chooser" role="radiogroup" aria-label="Appearance">
      {THEMES.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={theme === item.id}
          aria-label={item.label}
          tabIndex={theme === item.id ? 0 : -1}
          title={item.label}
          onClick={() => setTheme(item.id)}
          onKeyDown={(event) => navigate(event, index)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {item.icon === "monitor" && (
              <>
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </>
            )}
            {item.icon === "sun" && (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </>
            )}
            {item.icon === "moon" && (
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
            )}
          </svg>
          <span className="theme-choice-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
