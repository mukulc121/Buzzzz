import { isPattern, type Project } from "@buzzzz/core";
import type { RoomAssets } from "../assets.ts";
import type { RoomProject } from "../project.ts";
import type { RoomSockets } from "../sockets.ts";
import type { Room } from "../model.ts";
import { HttpError, randomId } from "../security.ts";
import { checkArguments } from "./arguments.ts";
import { EDITOR_TOOLS, MCP_TOOLS } from "./tools.ts";

export class McpDispatcher {
  constructor(
    private project: RoomProject,
    private assets: RoomAssets,
    private sockets: RoomSockets,
    private room: () => Room,
  ) {}

  async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.room();
    const tool = MCP_TOOLS.find((item) => item.name === name);
    if (!tool) throw new HttpError(404, "Unknown tool");
    checkArguments(args, tool.inputSchema);
    if (EDITOR_TOOLS.some((item) => item.name === name)) {
      if (name === "media_attach")
        await this.assets.validateMedia(String(args.assetUrl), this.room());
      return await this.sockets.editorCommand(name, args);
    }
    switch (name) {
      case "get_room": {
        const room = this.room();
        return { roomId: room.id, expiresAt: room.expires, phones: this.sockets.phoneCount() };
      }
      case "get_project":
        return this.project.snapshot();
      case "set_project":
        return this.project.save(args);
      case "list_patterns": {
        const state = this.requiredProject();
        return {
          revision: state.revision,
          patterns: state.project.presets.map(({ id, name }) => ({ id, name })),
        };
      }
      case "get_pattern": {
        const state = this.requiredProject();
        const preset = state.project.presets.find((item) => item.id === args.id);
        if (!preset) throw new HttpError(404, "Pattern not found");
        return { ...preset, revision: state.revision };
      }
      case "upsert_pattern":
        return this.upsert(args);
      case "delete_pattern":
        return this.remove(args);
      case "play_pattern": {
        const pattern =
          args.pattern ??
          this.requiredProject().project.presets.find((item) => item.id === args.id)?.pattern;
        if (!isPattern(pattern)) throw new HttpError(400, "Provide a valid pattern or pattern ID");
        return this.sockets.command({ type: "play", pattern });
      }
      case "stop_playback":
        return this.sockets.command({ type: "stop" });
      case "list_room_assets":
        return { assets: this.assets.list() };
      default:
        throw new HttpError(404, "Unknown tool");
    }
  }

  private requiredProject(): { project: Project; revision: number } {
    const state = this.project.snapshot();
    if (!state.project)
      throw new HttpError(409, "Open the editor to sync a project, or call set_project first");
    return { project: state.project, revision: state.revision };
  }

  private upsert(args: Record<string, unknown>) {
    if (!isPattern(args.pattern) || typeof args.name !== "string")
      throw new HttpError(400, "A name and valid pattern are required");
    const state = this.project.snapshot();
    const project = structuredClone(state.project ?? { presets: [], map: {} });
    const id = typeof args.id === "string" ? args.id : randomId();
    const index = project.presets.findIndex((item) => item.id === id);
    const preset = { ...project.presets[index], id, name: args.name, pattern: args.pattern };
    if (index < 0) project.presets.push(preset);
    else project.presets[index] = preset;
    return this.project.save({ project, baseRevision: args.baseRevision ?? state.revision });
  }

  private remove(args: Record<string, unknown>) {
    const state = this.requiredProject();
    if (!state.project.presets.some((item) => item.id === args.id))
      throw new HttpError(404, "Pattern not found");
    if (state.project.presets.length === 1) throw new HttpError(409, "Keep at least one pattern");
    const project = {
      ...state.project,
      presets: state.project.presets.filter((item) => item.id !== args.id),
      map: Object.fromEntries(Object.entries(state.project.map).filter(([, id]) => id !== args.id)),
    };
    return this.project.save({ project, baseRevision: args.baseRevision ?? state.revision });
  }
}
