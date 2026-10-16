import { ToolIcon } from "../../components/ToolIcon";
import { TOOLS } from "./catalog";
import type { ToolId } from "./model";

interface IToolPicker {
  onSelect: (tool: ToolId) => void;
}
const CATEGORIES = ["Generate", "Transform", "Audio", "Analyze"];

export function ToolPicker(props: IToolPicker) {
  const { onSelect } = props;
  return (
    <div className="panel-content tool-picker" aria-label="Studio tools">
      {CATEGORIES.map((category) => (
        <section className="tool-picker-group" key={category}>
          <h3>{category}</h3>
          <ul>
            {TOOLS.filter((tool) => tool.category === category).map((tool) => (
              <li key={tool.id}>
                <button onClick={() => onSelect(tool.id)} aria-label={tool.name}>
                  <span className="tool-picker-icon">
                    <ToolIcon name={tool.icon} />
                  </span>
                  <span className="tool-picker-text">
                    <span>{tool.name}</span>
                    <small>{tool.description}</small>
                  </span>
                  <svg
                    className="tool-picker-chevron"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
