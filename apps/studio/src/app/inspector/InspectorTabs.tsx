import type { KeyboardEvent } from "react";
import type { Studio } from "../useStudio";
import { InspectorIcon } from "../../components/InspectorIcon";

const tabs = ["inspector", "sound", "animation"] as const;
interface IInspectorTabs {
  current: Studio["inspector"];
  onChange: Studio["setInspector"];
  onCollapse: () => void;
}
export function InspectorTabs(props: IInspectorTabs) {
  const { current, onChange, onCollapse } = props;
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next]);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#tab-${tabs[next]}`)
      ?.focus();
  };
  return (
    <div className="inspector-tab-bar">
      <div className="inspector-tabs" role="tablist" aria-label="Inspector sections">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={current === tab}
            aria-controls={`panel-${tab}`}
            id={`tab-${tab}`}
            tabIndex={current === tab ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <InspectorIcon name={tab} />
            <span className="inspector-tab-label">{tab}</span>
          </button>
        ))}
      </div>
      <button
        className="inspector-collapse"
        type="button"
        title="Hide inspector"
        aria-label="Hide inspector"
        onClick={onCollapse}
      >
        <InspectorIcon name="collapse" />
      </button>
    </div>
  );
}
