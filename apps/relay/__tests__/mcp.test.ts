import { expect, test } from "bun:test";
import { parseRpc } from "../src/mcp/protocol.ts";
import { checkArguments } from "../src/mcp/arguments.ts";
import { MCP_TOOLS } from "../src/mcp/tools.ts";

const meta = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
};
const body = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: "audio_analyze", arguments: {}, _meta: meta },
};

test("modern MCP validates mirrored headers and encoded tool names", () => {
  const headers = {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "tools/call",
    "Mcp-Name": `=?base64?${btoa("audio_analyze")}?=`,
  };
  expect(parseRpc(body, new Request("https://relay.example/mcp", { headers })).modern).toBe(true);
  expect(() =>
    parseRpc(
      body,
      new Request("https://relay.example/mcp", {
        headers: { ...headers, "Mcp-Name": "stop_playback" },
      }),
    ),
  ).toThrow("mismatch");
  expect(() => parseRpc(body, new Request("https://relay.example/mcp"))).toThrow("mismatch");
});

test("tool arguments reject unknown properties, unsafe numbers, and invalid layers", () => {
  const audio = MCP_TOOLS.find((tool) => tool.name === "audio_analyze")!.inputSchema;
  expect(() => checkArguments({ frameMs: 1 }, audio)).toThrow();
  expect(() => checkArguments({ frameMs: 101 }, audio)).toThrow();
  expect(() => checkArguments({ frameMs: Number.NaN }, audio)).toThrow();
  expect(() => checkArguments(JSON.parse('{"__proto__":{}}'), audio)).toThrow();
  expect(() => checkArguments({ frameMs: 20 }, audio)).not.toThrow();
  const selection = MCP_TOOLS.find((tool) => tool.name === "editor_selection")!.inputSchema;
  expect(() =>
    checkArguments({ action: "set", points: [{ layer: "other", index: 0 }] }, selection),
  ).toThrow();
});
