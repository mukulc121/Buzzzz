import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { createHash } from "node:crypto";
import { networkInterfaces } from "node:os";
import type { Plugin, ViteDevServer } from "vite";
import { WebSocket, WebSocketServer } from "ws";
import { isRelayMessageAllowed, parseMessage } from "@buzzzz/core";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_STORE_BYTES = 100 * 1024 * 1024;
function sameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function allowedHost(host: string | undefined, allowed: string[] | true): boolean {
  if (!host) return false;
  try {
    const name = new URL(`http://${host}`).hostname;
    if (name === "localhost" || name.endsWith(".localhost") || isIP(name.replace(/^\[|\]$/g, "")))
      return true;
    if (allowed === true) return true;
    return allowed.some((entry) =>
      entry.startsWith(".") ? name === entry.slice(1) || name.endsWith(entry) : name === entry,
    );
  } catch {
    return false;
  }
}
function configureRelay(server: ViteDevServer) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
  const rivs = new Map<string, Buffer>();
  const roles = new WeakMap<WebSocket, "phone" | "studio">();
  let storedBytes = 0;
  const upgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => void = (
    req,
    socket,
    head,
  ) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/relay") return;
    const role = url.searchParams.get("role");
    if (
      !allowedHost(req.headers.host, server.config.server.allowedHosts) ||
      !sameOrigin(req.headers.origin, req.headers.host) ||
      (role !== "studio" && role !== "phone") ||
      wss.clients.size >= 32
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      roles.set(ws, role);
      wss.emit("connection", ws);
    });
  };
  server.httpServer?.on("upgrade", upgrade);
  const broadcastPeers = () => {
    const phones = [...wss.clients].filter((client) => roles.get(client) === "phone").length;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN)
        client.send(JSON.stringify({ type: "peers", phones }));
    }
  };
  wss.on("connection", (ws: WebSocket) => {
    ws.on("error", () => ws.close());
    ws.on("message", (data, binary) => {
      if (binary) return;
      const message = parseMessage(data.toString());
      if (!message) return;
      const role = roles.get(ws);
      if (!role || !isRelayMessageAllowed(role === "studio" ? "host" : "phone", message.type))
        return;
      for (const client of wss.clients) {
        if (roles.get(client) !== role && client.readyState === WebSocket.OPEN)
          client.send(JSON.stringify(message));
      }
    });
    ws.on("close", broadcastPeers);
    broadcastPeers();
  });
  server.middlewares.use((req, res, next) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (path !== "/lan" && path !== "/riv" && !path.startsWith("/riv/")) return next();
    if (!sameOrigin(req.headers.origin, req.headers.host)) {
      res.statusCode = 403;
      res.end();
      return;
    }
    res.setHeader("cache-control", "no-store");
    if (path === "/lan" && req.method === "GET") {
      const ip =
        Object.values(networkInterfaces())
          .flat()
          .find((a) => a?.family === "IPv4" && !a.internal)?.address ?? "localhost";
      const address = server.httpServer?.address();
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ip, port: typeof address === "object" && address ? address.port : 5173 }),
      );
      return;
    }
    if (path === "/riv" && req.method === "POST") {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) {
          chunks.length = 0;
          if (!res.writableEnded) {
            res.statusCode = 413;
            res.end("Rive files must be 20 MB or smaller");
          }
        } else if (!res.writableEnded) chunks.push(chunk);
      });
      req.on("error", () => {
        if (!res.writableEnded) {
          res.statusCode = 400;
          res.end();
        }
      });
      req.on("end", () => {
        if (res.writableEnded) return;
        const buffer = Buffer.concat(chunks);
        if (buffer.subarray(0, 4).toString() !== "RIVE") {
          res.statusCode = 400;
          res.end("Invalid Rive file");
          return;
        }
        const name = createHash("sha256").update(buffer).digest("hex") + ".riv";
        if (!rivs.has(name)) {
          while (storedBytes + buffer.length > MAX_STORE_BYTES || rivs.size >= 10) {
            const oldest = rivs.keys().next().value;
            if (!oldest) break;
            storedBytes -= rivs.get(oldest)!.length;
            rivs.delete(oldest);
          }
          rivs.set(name, buffer);
          storedBytes += buffer.length;
        }
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ path: "/riv/" + name }));
      });
      return;
    }
    const buffer = rivs.get(path.slice("/riv/".length));
    if (req.method === "GET" && buffer) {
      res.setHeader("content-type", "application/octet-stream");
      res.end(buffer);
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  return () => {
    server.httpServer?.off("upgrade", upgrade);
    for (const client of wss.clients) client.terminate();
    wss.close();
    rivs.clear();
  };
}
export function relay(): Plugin {
  return {
    name: "buzzzz-relay",
    configureServer(server) {
      const close = configureRelay(server);
      server.httpServer?.once("close", close);
    },
  };
}
