import { EDITOR_COMMANDS } from "@buzzzz/core";
import { HEADLESS_TOOLS } from "./config";
import type { McpBridge } from "./useMcpBridge";

interface IMcpTools {
  bridge: McpBridge;
  editorState: string;
}

export function McpTools(props: IMcpTools) {
  const { bridge, editorState } = props;
  return (
    <>
      <section className="mcp-section" aria-label="MCP tools">
        <h3>Tools</h3>
        <p className="hint">
          Project tools work while the room is open. Editor tools need this window.
        </p>
        <ul className="mcp-tool-list">
          {HEADLESS_TOOLS.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
          {EDITOR_COMMANDS.map((name) => (
            <li key={name} data-available={bridge.available}>
              <code>{name}</code>
              <small>{editorState}</small>
            </li>
          ))}
        </ul>
      </section>
      {bridge.activity.length > 0 && (
        <section className="mcp-section" aria-label="Recent editor commands">
          <h3>Recent editor commands</h3>
          <ul className="mcp-tool-list">
            {bridge.activity.map((item) => (
              <li key={`${item.at}-${item.command}`}>
                <code>{item.command}</code>
                <small>{item.ok ? "done" : item.message}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
