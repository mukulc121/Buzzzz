import { SYNC_LABEL } from "./config";
import type { McpBridge } from "./useMcpBridge";
import type { CanonicalProject } from "./useCanonicalProject";

interface IMcpStatus {
  connected: boolean;
  bridge: McpBridge;
  canonical: CanonicalProject;
  editorState: string;
}

export function McpStatus(props: IMcpStatus) {
  const { connected, bridge, canonical, editorState } = props;
  return (
    <dl className="mcp-status">
      <div>
        <dt>Relay</dt>
        <dd role="status">{connected ? "Connected" : "Reconnecting…"}</dd>
      </div>
      <div>
        <dt>Project</dt>
        <dd role="status" data-status={canonical.status}>
          {SYNC_LABEL[canonical.status]}
          {canonical.error && <small>{canonical.error}</small>}
        </dd>
      </div>
      <div>
        <dt>Editor tools</dt>
        <dd role="status">{bridge.busy ? "Running a command…" : editorState}</dd>
      </div>
    </dl>
  );
}
