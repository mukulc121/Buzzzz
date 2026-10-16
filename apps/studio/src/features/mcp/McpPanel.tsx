import { useState } from "react";
import { EDITOR_COMMANDS } from "@buzzzz/core";
import { cloudOrigin, type IRoom } from "../connection/cloud";
import { clientConfig, HEADLESS_TOOLS, SYNC_LABEL } from "./config";
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
      <section className="panel-content">
        <h2>MCP</h2>
        <p className="hint">
          MCP needs the hosted Cloudflare relay. Set VITE_RELAY_URL for your deployment.
        </p>
      </section>
    );
  if (!room)
    return (
      <section className="panel-content">
        <h2>MCP</h2>
        <p className="hint" role="status">
          Creating a private room…
        </p>
      </section>
    );
  const config = clientConfig(origin, room);
  return (
    <section className="panel-content">
      <h2>MCP</h2>
      <p className="hint">
        Agents with this token can read and edit the room project and drive this editor until{" "}
        {new Date(room.expiresAt).toLocaleString()}. Treat it like a password.
      </p>
      <label className="field">
        Endpoint
        <input aria-label="MCP endpoint" readOnly value={config.url} />
      </label>
      <div className="row">
        <button onClick={() => copy("command", config.command)}>
          {copied === "command" ? "Copied" : "Copy Claude Code command"}
        </button>
        <button onClick={() => copy("json", config.json)}>
          {copied === "json" ? "Copied" : "Copy JSON config"}
        </button>
      </div>
      <dl>
        <dt>Relay</dt>
        <dd role="status">{connected ? "Connected" : "Reconnecting…"}</dd>
        <dt>Project</dt>
        <dd role="status" data-status={canonical.status}>
          {SYNC_LABEL[canonical.status]}
          {canonical.error && <small> {canonical.error}</small>}
        </dd>
        <dt>Editor tools</dt>
        <dd role="status">{bridge.busy ? "Running a command…" : editorState}</dd>
      </dl>
      {canonical.status === "conflict" && (
        <div className="row">
          <button onClick={() => canonical.resolve("keep-mine")}>Keep mine</button>
          <button onClick={() => canonical.resolve("use-theirs")}>Use room version</button>
          <button onClick={() => canonical.resolve("save-copy")}>Save mine as copy</button>
        </div>
      )}
      {canonical.status === "error" && <button onClick={canonical.retry}>Retry sync</button>}
      <h3>Tools</h3>
      <p className="hint">
        Project tools work while the room is open. Editor tools need this window.
      </p>
      <ul className="list">
        {HEADLESS_TOOLS.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
        {EDITOR_COMMANDS.map((name) => (
          <li key={name} data-available={bridge.available}>
            <code>{name}</code> <small>{editorState}</small>
          </li>
        ))}
      </ul>
      {bridge.activity.length > 0 && (
        <>
          <h3>Recent editor commands</h3>
          <ul className="list">
            {bridge.activity.map((item) => (
              <li key={`${item.at}-${item.command}`}>
                <code>{item.command}</code> {item.ok ? "done" : item.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
