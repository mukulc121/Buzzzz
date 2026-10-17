import { PanelCollapseIcon } from "../../components/PanelCollapseIcon";
import { ToolIcon } from "../../components/ToolIcon";
import { ToolBody } from "./ToolBody";
import { ToolPicker } from "./ToolPicker";
import { TOOLS } from "./catalog";
import type { IToolSession } from "./model";
import type { useToolWorkspace } from "./useToolWorkspace";

interface IToolsPanel {
  tools: ReturnType<typeof useToolWorkspace>;
  session: IToolSession;
  onHide: () => void;
}

export function ToolsPanel(props: IToolsPanel) {
  const { tools, session, onHide } = props;
  const active = TOOLS.find((tool) => tool.id === tools.active);
  return (
    <>
      <header className="panel-heading tool-heading">
        <div>
          {active && (
            <button
              className="icon"
              aria-label="Back to tools"
              onClick={() => tools.setActive(null)}
            >
              <ToolIcon name="back" />
            </button>
          )}
          <h2>{active?.name ?? "Tools"}</h2>
        </div>
        <div>
          {active && (
            <button
              className="icon"
              aria-label="Open in window"
              title="Open in window"
              onClick={() => tools.popOut(active.id)}
            >
              <ToolIcon name="popOut" />
            </button>
          )}
          <button className="icon" aria-label="Hide panel" onClick={onHide}>
            <PanelCollapseIcon />
          </button>
        </div>
      </header>
      {active ? (
        <section className="tool-content" aria-label={active.name}>
          <ToolBody tool={active.id} session={session} />
        </section>
      ) : (
        <ToolPicker onSelect={tools.setActive} />
      )}
    </>
  );
}
