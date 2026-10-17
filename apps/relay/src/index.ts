import { failure, HttpError, json, randomId } from "./security.ts";
import { isStudioOrigin } from "./origins.ts";
import { pairByCode } from "./pairByCode.ts";

export { RelayRoom } from "./room.ts";
export { PairingCode } from "./pairingCodes.ts";

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (!isStudioOrigin(origin, env.STUDIO_ORIGINS)) {
    const url = new URL(request.url);
    if (url.pathname === "/relay" && request.headers.get("Upgrade")?.toLowerCase() === "websocket")
      return null;
    throw new HttpError(403, "Origin is not allowed");
  }
  return origin;
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      const origin = allowedOrigin(request, env);
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        if (!origin) throw new HttpError(403, "A Studio origin is required");
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers":
              "Authorization,Content-Type,Range,MCP-Protocol-Version,Mcp-Method,Mcp-Name",
            "Access-Control-Max-Age": "600",
            Vary: "Origin",
          },
        });
      }
      if (url.pathname === "/health" && request.method === "GET") {
        return json({ ok: true });
      }
      const edge = await env.EDGE_RATE_LIMITER.limit({
        key: request.headers.get("CF-Connecting-IP") ?? "local",
      });
      if (!edge.success) throw new HttpError(429, "Too many requests");
      let response: Response;
      if (url.pathname === "/v1/rooms" && request.method === "POST") {
        if (!origin) throw new HttpError(403, "A Studio origin is required");
        const roomId = randomId();
        const result = await env.ROOMS.getByName(roomId).create(roomId, url.origin);
        response = json(result, 201);
      } else if (url.pathname === "/v1/pair" && request.method === "POST") {
        response = await pairByCode(request, env);
      } else {
        const roomId =
          url.pathname === "/relay"
            ? url.searchParams.get("room")
            : url.pathname.match(/^\/v1\/(?:rooms|shares)\/([a-f0-9]{32})(?:\/|$)/)?.[1];
        if (!roomId || !/^[a-f0-9]{32}$/.test(roomId)) throw new HttpError(404, "Not found");
        response = await env.ROOMS.getByName(roomId).fetch(request);
      }
      if (origin && response.status !== 101) {
        response = new Response(response.body, response);
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Expose-Headers", "Content-Length,Content-Range");
        response.headers.set("Vary", "Origin");
      }
      return response;
    } catch (error) {
      const response = failure(error);
      const origin = request.headers.get("Origin");
      if (origin && isStudioOrigin(origin, env.STUDIO_ORIGINS)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Vary", "Origin");
      }
      return response;
    }
  },
} satisfies ExportedHandler<Env>;
