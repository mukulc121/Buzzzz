import { useState } from "react";
import { Copy } from "../../components/icons";

interface IMcpSetup {
  command: string;
  json: string;
  copied: string | null;
  onCopy: (label: string, value: string) => void;
}

const EXAMPLE = "Design a double-tap and play it on my phone";

export function McpSetup(props: IMcpSetup) {
  const { command, json, copied, onCopy } = props;
  const [client, setClient] = useState<"command" | "json">("command");
  return (
    <section className="mcp-section mcp-setup" aria-label="Connect an agent">
      <h3 className="mcp-section-heading">Connect an agent</h3>
      <ol className="mcp-steps">
        <li>
          <h3>Register the server</h3>
          <div className="mcp-client-tabs" role="group" aria-label="MCP client configuration">
            <button aria-pressed={client === "command"} onClick={() => setClient("command")}>
              Claude Code
            </button>
            <button aria-pressed={client === "json"} onClick={() => setClient("json")}>
              JSON config
            </button>
          </div>
          <p className="hint">
            {client === "command"
              ? "Run once in your terminal."
              : "Add this to your MCP client configuration."}
          </p>
          <div className="mcp-snippet">
            <pre>
              <code>{client === "command" ? command : json}</code>
            </pre>
            <button
              className="icon"
              aria-label={client === "command" ? "Copy Claude Code command" : "Copy JSON config"}
              onClick={() => onCopy(client, client === "command" ? command : json)}
            >
              <Copy />
            </button>
          </div>
          {copied === client && (
            <p className="hint" role="status">
              Copied
            </p>
          )}
        </li>
        <li>
          <h3>Ask it for something</h3>
          <p className="hint">
            This room is linked to this editor. Your client can edit the canvas while you watch.
          </p>
          <div className="mcp-snippet">
            <pre>
              <code>{EXAMPLE}</code>
            </pre>
            <button
              className="icon"
              aria-label="Copy example prompt"
              onClick={() => onCopy("example", EXAMPLE)}
            >
              <Copy />
            </button>
          </div>
          {copied === "example" && (
            <p className="hint" role="status">
              Copied
            </p>
          )}
        </li>
      </ol>
    </section>
  );
}
