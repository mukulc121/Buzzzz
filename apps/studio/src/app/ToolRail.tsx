import { Bolt } from "../components/icons";

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
const ITEMS: { id: Panel; label: string; path: string }[] = [
  { id: "patterns", label: "Patterns", path: "M4 3h3v18H4zm6 0h3v18h-3zm5 1 3-1 6 17-3 1z" },
  { id: "media", label: "Media", path: "M3 9v6m4-10v14m5-18v22m5-18v14m4-10v6" },
  { id: "device", label: "Device", path: "M7 2h10v20H7zM11 18h2" },
  {
    id: "share",
    label: "Share",
    path: "m8 8 8-4M8 16l8 4M7 8a3 3 0 1 0 0 .1M18 4a3 3 0 1 0 0 .1M18 20a3 3 0 1 0 0 .1",
  },
  { id: "mcp", label: "MCP", path: "M5 8h14v12H5zM12 2v6M2 12h3m14 0h3M8 13v2m8-2v2M9 18h6" },
  { id: "tools", label: "Tools", path: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" },
  {
    id: "settings",
    label: "Settings",
    path: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  },
  { id: "learn", label: "Learn", path: "m2 8 10-5 10 5-10 5zM6 10v7q6 6 12 0v-7M22 8v9" },
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
        title="Buzzzz projects"
        onClick={() => onSelect("projects")}
      >
        <Bolt />
      </button>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={active === item.id ? "active" : ""}
          aria-pressed={active === item.id}
          onClick={() => onSelect(active === item.id ? null : item.id)}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d={item.path} />
          </svg>
          <span>{item.label}</span>
          {item.id === "device" && phones > 0 && <i className="connected-indicator" />}
        </button>
      ))}
    </nav>
  );
}
