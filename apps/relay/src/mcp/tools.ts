type Schema = Record<string, unknown>;
const text = { type: "string", minLength: 1, maxLength: 512 };
const time = { type: "number", minimum: 0, maximum: 60000 };
const duration = { type: "number", minimum: 1, maximum: 60000 };
const offset = { type: "number", minimum: 0, maximum: 86400000 };
const object = { type: "object" };
const revision = { type: "integer", minimum: 0 };
const action = { type: "string", enum: ["apply", "add"] };
const kind = { type: "string", enum: ["audio", "animation"] };

function tool(
  name: string,
  description: string,
  properties: Schema = {},
  required: string[] = [],
  readOnly = false,
) {
  return {
    name,
    description,
    inputSchema: { type: "object", properties, required, additionalProperties: false },
    annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, openWorldHint: false },
  };
}

export const EDITOR_TOOLS = [
  tool(
    "audio_analyze",
    "Analyze the attached audio in the open editor.",
    {
      frameMs: { type: "number", minimum: 2, maximum: 100 },
      offsetMs: offset,
      durationMs: duration,
      metrics: { type: "array", items: text, maxItems: 20 },
    },
    [],
    true,
  ),
  tool("audio_generate", "Generate haptics from the attached audio in the open editor.", {
    approach: text,
    options: object,
    action,
  }),
  tool(
    "animation_analyze",
    "Analyze the attached animation in the open editor.",
    {
      sampleHz: { type: "number", minimum: 60, maximum: 480 },
      smoothingMs: { type: "number", minimum: 0, maximum: 40 },
    },
    [],
    true,
  ),
  tool("animation_generate", "Generate haptics from the attached animation in the open editor.", {
    approach: text,
    options: object,
    action,
  }),
  tool(
    "editor_selection",
    "Read, set, or clear the open editor selection.",
    {
      action: { type: "string", enum: ["get", "set", "clear"] },
      points: {
        type: "array",
        maxItems: 10000,
        items: {
          type: "object",
          properties: {
            layer: { enum: ["amplitude", "frequency", "discrete"] },
            index: { type: "integer", minimum: 0 },
          },
          required: ["layer", "index"],
          additionalProperties: false,
        },
      },
    },
    ["action"],
  ),
  tool("editor_cursor", "Read the cursor or move it to timeMs in the open editor.", {
    timeMs: time,
  }),
  tool("editor_range", "Read or set the open editor playback range.", {
    startMs: time,
    endMs: time,
    enabled: { type: "boolean" },
  }),
  tool(
    "editor_history",
    "Undo or redo one edit in the open editor.",
    { action: { type: "string", enum: ["undo", "redo"] } },
    ["action"],
  ),
  tool(
    "media_attach",
    "Attach a room asset to the open editor. Upload the asset first.",
    { kind, assetUrl: { type: "string", maxLength: 1024 }, filename: text },
    ["kind", "assetUrl", "filename"],
  ),
  tool("media_detach", "Detach audio or animation from the open editor.", { kind }, ["kind"]),
  tool(
    "media_trim",
    "Set audio trim in the open editor, in milliseconds.",
    { offsetMs: offset, durationMs: duration },
    ["offsetMs", "durationMs"],
  ),
];

export const MCP_TOOLS = [
  tool("get_room", "Read room expiry and connected phone count.", {}, [], true),
  tool("get_project", "Read the canonical room project and revision.", {}, [], true),
  tool(
    "set_project",
    "Replace the canonical project. Supply baseRevision to reject stale writes.",
    {
      project: object,
      projectId: { type: "string", minLength: 1, maxLength: 64, pattern: "^[\\w-]+$" },
      baseRevision: revision,
    },
    ["project"],
  ),
  tool("list_patterns", "List project pattern IDs and names.", {}, [], true),
  tool("get_pattern", "Read one project pattern by ID.", { id: text }, ["id"], true),
  tool(
    "upsert_pattern",
    "Create or replace a project pattern.",
    { id: text, name: text, pattern: object, baseRevision: revision },
    ["name", "pattern"],
  ),
  tool(
    "delete_pattern",
    "Delete a pattern and its trigger mappings. Keep at least one pattern.",
    { id: text, baseRevision: revision },
    ["id"],
  ),
  tool("play_pattern", "Play a pattern ID or inline pattern on paired phones.", {
    id: text,
    pattern: object,
  }),
  tool("stop_playback", "Stop haptics on paired phones."),
  tool(
    "list_room_assets",
    "List uploaded room asset metadata. Read capabilities are not disclosed.",
    {},
    [],
    true,
  ),
  ...EDITOR_TOOLS,
];
