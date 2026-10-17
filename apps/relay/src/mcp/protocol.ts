import { isRecord } from "@buzzzz/core";

export const MCP_VERSIONS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"];
export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public status = 400,
    public data?: unknown,
  ) {
    super(message);
  }
}

function headerValue(value: string | null): string | null {
  if (!value?.startsWith("=?base64?") || !value.endsWith("?=")) return value;
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      Uint8Array.from(atob(value.slice(9, -2)), (letter) => letter.charCodeAt(0)),
    );
  } catch {
    throw new RpcError(-32020, "Malformed MCP header");
  }
}

export function parseRpc(input: unknown, request: Request) {
  if (
    !isRecord(input) ||
    input.jsonrpc !== "2.0" ||
    typeof input.method !== "string" ||
    input.method.length > 128 ||
    (input.id !== undefined &&
      !(typeof input.id === "string" && input.id.length <= 128) &&
      !(typeof input.id === "number" && Number.isSafeInteger(input.id)))
  )
    throw new RpcError(-32600, "Invalid JSON-RPC request");
  if (input.params !== undefined && !isRecord(input.params))
    throw new RpcError(-32602, "params must be an object");
  const params = isRecord(input.params) ? input.params : {};
  const meta = isRecord(params._meta) ? params._meta : {};
  const version = request.headers.get("MCP-Protocol-Version") ?? "2025-03-26";
  if (!MCP_VERSIONS.includes(version))
    throw new RpcError(-32022, "Unsupported protocol version", 400, {
      requested: version,
      supported: MCP_VERSIONS,
    });
  const modern = version === "2026-07-28";
  if (
    meta["io.modelcontextprotocol/protocolVersion"] !== undefined &&
    meta["io.modelcontextprotocol/protocolVersion"] !== request.headers.get("MCP-Protocol-Version")
  )
    throw new RpcError(-32020, "MCP header and body mismatch");
  if (modern) {
    if (
      meta["io.modelcontextprotocol/protocolVersion"] === undefined ||
      !isRecord(meta["io.modelcontextprotocol/clientCapabilities"])
    )
      throw new RpcError(-32602, "Protocol version and client capabilities metadata are required");
    if (
      meta["io.modelcontextprotocol/protocolVersion"] !== version ||
      request.headers.get("Mcp-Method") !== input.method ||
      (input.method === "tools/call" &&
        headerValue(request.headers.get("Mcp-Name")) !== params.name)
    )
      throw new RpcError(-32020, "MCP header and body mismatch");
  }
  return { id: input.id, method: input.method, params, modern };
}
