import type { IRoom } from "../connection/cloud";
import { mcpUrl } from "./api";
import type { TSyncStatus } from "./sync";

export const HEADLESS_TOOLS = [
  "get_room",
  "get_project",
  "set_project",
  "list_patterns",
  "get_pattern",
  "upsert_pattern",
  "delete_pattern",
  "play_pattern",
  "stop_playback",
  "list_room_assets",
] as const;

export const SYNC_LABEL: Record<TSyncStatus, string> = {
  off: "Not shared with the room",
  paused: "Paused: this window is read only",
  syncing: "Syncing with the room…",
  synced: "In sync with the room",
  conflict: "The room project changed while you were editing",
  error: "Room sync failed",
};

export function clientConfig(origin: string, room: Pick<IRoom, "roomId" | "hostToken">) {
  const url = mcpUrl(origin, room);
  const header = `Authorization: Bearer ${room.hostToken}`;
  return {
    url,
    command: `claude mcp add --transport http buzzzz ${url} --header "${header}"`,
    json: JSON.stringify(
      {
        mcpServers: {
          buzzzz: { type: "http", url, headers: { Authorization: `Bearer ${room.hostToken}` } },
        },
      },
      null,
      2,
    ),
  };
}
