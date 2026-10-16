import { Bolt, Monitor, Moon, Sun } from "../components/icons";
import type { Theme } from "./useTheme";

interface IHeader {
  phones: number;
  connected: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const THEMES: { id: Theme; Icon: typeof Sun; label: string }[] = [
  { id: "light", Icon: Sun, label: "Light" },
  { id: "system", Icon: Monitor, label: "System" },
  { id: "dark", Icon: Moon, label: "Dark" },
];

export function Header(props: IHeader) {
  const { phones, connected, theme, setTheme } = props;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">
          <Bolt />
        </span>
        Buzzzz <span className="brand-detail">Haptics studio</span>
      </div>
      <span className={phones ? "status on" : "status"}>
        <i className="dot" key={phones ? "on" : "off"} />
        {!connected
          ? "Relay reconnecting"
          : phones
            ? `${phones} phone${phones > 1 ? "s" : ""} connected`
            : "Connect your phone"}
      </span>
      <div className="seg theme" role="radiogroup" aria-label="Theme">
        {THEMES.map(({ id, Icon, label }) => (
          <button
            key={id}
            role="radio"
            aria-checked={theme === id}
            className={theme === id ? "on" : ""}
            title={label}
            onClick={() => setTheme(id)}
          >
            <Icon />
          </button>
        ))}
      </div>
    </header>
  );
}
