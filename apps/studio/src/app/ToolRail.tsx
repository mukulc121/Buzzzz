import { NavigationIcon } from "../components/icons";
import pulsarLogo from "../assets/pulsar-logo.svg";

export type Panel =
  | "projects"
  | "patterns"
  | "media"
  | "device"
  | "share"
  | "mcp"
  | "tools"
  | "settings"
  | "learn";
const ITEMS: { id: Exclude<Panel, "projects">; label: string }[] = [
  { id: "patterns", label: "Patterns" },
  { id: "media", label: "Media" },
  { id: "device", label: "Device" },
  { id: "share", label: "Share" },
  { id: "mcp", label: "MCP" },
  { id: "tools", label: "Tools" },
  { id: "settings", label: "Settings" },
  { id: "learn", label: "Learn" },
];
interface IToolRail {
  active: Panel | null;
  onSelect: (panel: Panel | null) => void;
  phones: number;
}
export function ToolRail(props: IToolRail) {
  const { active, onSelect, phones } = props;
  return (
    <nav className="tool-rail" aria-label="Workspace">
      <button
        className="rail-brand"
        aria-label="Projects"
        title="Back to projects"
        onClick={() => onSelect("projects")}
      >
        <img src={pulsarLogo} width={30} height={30} alt="Pulsar" />
      </button>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          data-panel={item.id}
          className={active === item.id ? "active" : ""}
          aria-pressed={active === item.id}
          onClick={() => onSelect(active === item.id ? null : item.id)}
        >
          <NavigationIcon name={item.id} />
          <span>{item.label}</span>
          {item.id === "device" && phones > 0 && <i className="connected-indicator" />}
        </button>
      ))}
    </nav>
  );
}
