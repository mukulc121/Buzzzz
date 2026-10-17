import { isRecord } from "@buzzzz/core";
import { HttpError, json, readJson } from "../security.ts";
import type { McpDispatcher } from "./dispatch.ts";
import { MCP_VERSIONS, parseRpc, RpcError } from "./protocol.ts";
import { MCP_TOOLS } from "./tools.ts";

const SERVER = { name: "buzzzz", version: "0.0.0" };

export async function handleMcp(request: Request, dispatcher: McpDispatcher): Promise<Response> {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (request.headers.get("Content-Type")?.split(";")[0]?.trim() !== "application/json")
    return json({ error: "Use application/json" }, 415);
  const accept = request.headers.get("Accept") ?? "*/*";
  if (!accept.includes("application/json") && !accept.includes("*/*"))
    return json({ error: "Accept application/json responses" }, 406);
  let id: unknown = null;
  try {
    let input: unknown;
    try {
      input = await readJson(request, 1024 * 1024);
    } catch (error) {
      if (error instanceof HttpError && error.status === 413) throw error;
      throw new RpcError(-32700, "Invalid JSON");
    }
    if (isRecord(input) && (typeof input.id === "string" || typeof input.id === "number"))
      id = input.id;
    const rpc = parseRpc(input, request);
    if (rpc.id === undefined) {
      if (rpc.method === "notifications/initialized" || rpc.method === "notifications/cancelled")
        return new Response(null, { status: 202 });
      throw new RpcError(-32600, "Requests require an ID");
    }
    let result: Record<string, unknown>;
    switch (rpc.method) {
      case "initialize":
        result = {
          protocolVersion: MCP_VERSIONS.slice(1).includes(String(rpc.params.protocolVersion))
            ? rpc.params.protocolVersion
            : "2025-11-25",
          capabilities: { tools: {} },
          serverInfo: SERVER,
          instructions:
            "Private room access. Browser media and editor tools require an open Buzzzz Studio connected to this room.",
        };
        break;
      case "server/discover":
        result = {
          supportedVersions: MCP_VERSIONS,
          capabilities: { tools: {} },
          instructions: "Private room tools. Browser tools require an open connected editor.",
        };
        break;
      case "ping":
        result = {};
        break;
      case "tools/list":
        result = { tools: MCP_TOOLS };
        break;
      case "tools/call": {
        if (
          typeof rpc.params.name !== "string" ||
          (rpc.params.arguments !== undefined && !isRecord(rpc.params.arguments))
        )
          throw new RpcError(-32602, "A tool name and object arguments are required");
        try {
          const value = await dispatcher.call(
            rpc.params.name,
            isRecord(rpc.params.arguments) ? rpc.params.arguments : {},
          );
          result = {
            content: [{ type: "text", text: JSON.stringify(value) ?? "null" }],
            structuredContent: isRecord(value) ? value : { value },
            isError: false,
          };
        } catch (error) {
          const message = error instanceof HttpError ? error.message : "Tool execution failed";
          result = {
            content: [{ type: "text", text: message }],
            isError: true,
            structuredContent: {
              error: message,
              ...(error instanceof HttpError ? error.details : {}),
            },
          };
        }
        break;
      }
      default:
        throw new RpcError(-32601, "Method not found", 404);
    }
    if (rpc.modern)
      result = {
        ...result,
        resultType: "complete",
        _meta: { "io.modelcontextprotocol/serverInfo": SERVER },
      };
    return json({ jsonrpc: "2.0", id: rpc.id, result });
  } catch (error) {
    if (error instanceof HttpError)
      return json(
        { jsonrpc: "2.0", id, error: { code: -32602, message: error.message } },
        error.status,
      );
    const rpc = error instanceof RpcError ? error : new RpcError(-32603, "Internal error", 500);
    return json(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code: rpc.code,
          message: rpc.message,
          ...(rpc.data === undefined ? {} : { data: rpc.data }),
        },
      },
      rpc.status,
    );
  }
}
