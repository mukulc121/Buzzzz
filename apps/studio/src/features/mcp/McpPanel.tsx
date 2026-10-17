import { useState } from "react";
import { Copy } from "../../components/icons";
import { cloudOrigin, type IRoom } from "../connection/cloud";
import { clientConfig } from "./config";
import { McpStatus } from "./McpStatus";
import { McpTools } from "./McpTools";
import { McpSetup } from "./McpSetup";
import type { McpBridge } from "./useMcpBridge";
import type { CanonicalProject } from "./useCanonicalProject";

interface IMcpPanel {
  room: IRoom | null;
  connected: boolean;
  bridge: McpBridge;
  canonical: CanonicalProject;
  onError: (message: string) => void;
}

export function McpPanel(props: IMcpPanel) {
  const { room, connected, bridge, canonical, onError } = props;
  const [copied, setCopied] = useState<string | null>(null);
  const origin = cloudOrigin();
  const copy = (label: string, value: string) =>
    void navigator.clipboard
      .writeText(value)
      .then(() => setCopied(label))
      .catch(() => onError("Select the text and copy it manually"));
  const editorState = !bridge.available ? "offline" : bridge.readOnly ? "read only" : "ready";

  if (!origin)
    return (
      <section className="panel-content mcp-panel" aria-label="MCP connection">
        <p className="hint">MCP is available when this studio is connected to a hosted relay.</p>
      </section>
    );
  if (!room)
    return (
      <section className="panel-content mcp-panel" aria-label="MCP connection">
        <p className="hint" role="status">
          Creating a private room…
        </p>
      </section>
    );
  const config = clientConfig(origin, room);
  return (
    <section className="panel-content mcp-panel" aria-label="MCP connection">
      <section className="mcp-section">
        <h3 className="mcp-section-heading">Editor connection</h3>
        <McpStatus
          connected={connected}
          bridge={bridge}
          canonical={canonical}
          editorState={editorState}
        />
        <p className="hint">
          This tab is{" "}
          {bridge.available
            ? "live: agent commands apply here."
            : "offline. Keep it open for editor commands."}
        </p>
      </section>
      <McpSetup command={config.command} json={config.json} copied={copied} onCopy={copy} />
      <section className="mcp-section">
        <h3 className="mcp-section-heading">Connection details</h3>
        <label className="field mcp-endpoint">
          Endpoint
          <textarea
            aria-label="MCP endpoint"
            readOnly
            rows={3}
            spellCheck={false}
            value={config.url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <div className="mcp-actions">
          <button onClick={() => copy("endpoint", config.url)}>
            <Copy /> {copied === "endpoint" ? "Copied" : "Copy endpoint"}
          </button>
        </div>
        <p className="hint">
          The configuration can read and edit this project until{" "}
          {new Date(room.expiresAt).toLocaleString()}. Keep it private.
        </p>
      </section>
      {canonical.status === "conflict" && (
        <div className="mcp-actions">
          <button onClick={() => canonical.resolve("keep-mine")}>Keep mine</button>
          <button onClick={() => canonical.resolve("use-theirs")}>Use room version</button>
          <button onClick={() => canonical.resolve("save-copy")}>Save mine as copy</button>
        </div>
      )}
      {canonical.status === "error" && <button onClick={canonical.retry}>Retry sync</button>}
      <McpTools bridge={bridge} editorState={editorState} />
    </section>
  );
}
