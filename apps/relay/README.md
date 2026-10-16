# Relay

Cloudflare Worker, SQLite Durable Objects, and private R2 storage. Each room has its own host token, phone tokens, assets, and project shares. Tokens are random bearer credentials. Only their SHA-256 hashes are stored.

From the repository root, after `bun install`:

```sh
bun run --cwd apps/relay dev
bun run --cwd apps/relay typecheck
bun run --cwd apps/relay test
bun run --cwd apps/relay build
```

Use Node 22 or newer. Local development listens on port 8787 and emulates storage. `build` only prepares a deployment with `--dry-run`. `typecheck` regenerates ignored Cloudflare types, including the `Env` bindings. Integration tests use Node and Miniflare because Bun 1.4 cannot start workerd reliably inside its test runner.

Before a real deployment, create the private R2 bucket named in `wrangler.jsonc`, set `STUDIO_ORIGINS` to the exact deployed Studio origins, and configure the Worker hostname. Keep the bucket private. An R2 lifecycle rule deleting objects after one day is a fallback for interrupted uploads. No remote resources or credentials are included here. The compatibility date matches the newest date supported by the pinned local runtime.

| Request                                              | Access and response                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/rooms`                                     | Allowed Studio Origin. Returns `roomId`, `hostToken`, `expiresAt`, `pairing`, and final authenticated `relayUrl`.    |
| `POST /v1/rooms/:room/pair`                          | JSON `{code,device}`. Returns `phoneToken`, `expiresAt`, and final `relayUrl`.                                       |
| `POST /v1/rooms/:room/pairing`                       | Host bearer token. Rotates the single-use six-digit code.                                                            |
| `GET /relay?room=:room&token=:token`                 | WebSocket. Token determines the role. Host connections also require a Studio Origin.                                 |
| `POST /v1/rooms/:room/assets?kind=rive`              | Host bearer token, raw body, Content-Length, application/octet-stream. Returns `assetId`, `path`, `url`, and expiry. |
| `POST /v1/rooms/:room/assets?kind=media`             | Same access. Accepts audio, video, animation JSON, or application/zip+dotlottie.                                     |
| `GET /v1/rooms/:room/assets/:asset?token=:readToken` | Asset read capability. Supports HEAD and single forward byte ranges.                                                 |
| `DELETE /v1/rooms/:room/assets/:asset`               | Host. Revokes and deletes an asset.                                                                                  |
| `POST /v1/rooms/:room/shares`                        | Host, JSON `{projectId,project}`. Returns `shareId`, read `token`, JSON `url`, and expiry.                           |
| `PUT /v1/rooms/:room/shares/:share`                  | Host, JSON `{project}`. Updates the document and preserves its read token.                                           |
| `GET /v1/shares/:room/:share?token=:readToken`       | Read capability. Returns `{project,expiresAt}`.                                                                      |
| `DELETE /v1/rooms/:room/shares/:share`               | Host. Revokes a share.                                                                                               |
| `DELETE /v1/rooms/:room/phones`                      | Host. Revokes every paired phone.                                                                                    |
| `GET /v1/rooms/:room/project`                        | Host. Returns `{project,revision,projectId}`, initially `{project:null,revision:0,projectId:null}`.                  |
| `PUT /v1/rooms/:room/project`                        | Host, JSON `{projectId,project,baseRevision?}`. Stale revisions return 409 with the current document.                |
| `POST /v1/rooms/:room/mcp`                           | Host. JSON Streamable HTTP MCP endpoint.                                                                             |
| `DELETE /v1/rooms/:room`                             | Host. Closes connections and deletes room data.                                                                      |

Pairing deep links use `rivehaptics://pair?server=<encoded-origin>&room=<room>&code=<code>`. A pairing code expires after ten minutes. Rooms, sessions, assets, and shares expire after 24 hours. Losing the host token loses administrative access; the expiry still applies.

Host WebSockets can send validated load, map, play, stop, fire, restart, and pause commands. Phones can send hello and fired events. The server emits peer counts and a session metadata message. Connections cannot choose their role. A load command must reference a signed Rive asset in the same room and relay origin. The last load and map replay when a phone reconnects. Text `ping` receives `pong` without waking the object.

Limits are 32 connections, 16 paired phone tokens, 20 MiB per file, 10 files and 100 MiB per room, 10 project shares, and 1 MiB per share body. Edge requests are bounded per IP. Pairing reserves each attempt before asynchronous checks, allows ten attempts per IP per minute, and invalidates a code after thirty guesses. Host renewal resets the code budget. Public reads authenticate before their per-link, per-IP quota; verification attempts have a separate IP quota. The origin allowlist controls browser access; bearer tokens provide room authorization.

Read links grant access to anyone holding the URL. Keep token URLs out of logs and analytics. Responses disable caching and referrer forwarding. Hosted deployment and physical-phone playback must be verified separately from the local runtime tests.

MCP clients use the room endpoint with `Authorization: Bearer <hostToken>`. The server supports protocol 2026-07-28 and initialization-based 2025 versions. It returns JSON responses and does not provide an SSE subscription stream. Studio budgets queued commands from arrival and cancels them after 25 seconds; the relay expires requests after 30 seconds and ignores late replies. Protocol details follow the [MCP HTTP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

Headless tools read and edit the project, manage patterns, list asset metadata, and play or stop paired phones. Project writes atomically increase the revision and refresh share snapshots with the same `projectId`, preserving their read tokens, then notify connected editors. Project IDs contain 1–64 letters, numbers, underscores, or hyphens. MCP edits retain the current canonical project ID unless `set_project` supplies one. Legacy shares without a project ID remain fixed snapshots. Explicit share PUT remains available. Browser tools analyze or generate audio/animation haptics, manage media, and control selection, cursor, range, undo, and redo. They require an open editor. Each request goes to one host, accepts only that host's reply, and expires after 30 seconds. Arguments are limited to 64 KiB and results to 1 MiB. Upload media first; the bridge accepts signed room URLs rather than file payloads. Worker invocation URL logs are disabled to keep query tokens out of those logs.
