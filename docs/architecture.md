# Architecture

Buzzzz has four apps and one shared package. Bun manages the workspaces and lockfile. Vite+ runs development, builds, linting, and formatting.

| Workspace        | Owns                                                | Internal imports |
| ---------------- | --------------------------------------------------- | ---------------- |
| `apps/studio`    | Composer, media analysis, tools, Rive, local relay  | `@buzzzz/core`   |
| `apps/preview`   | Native Rive and Pulsar playback, connection UI      | `@buzzzz/core`   |
| `apps/relay`     | Cloudflare rooms, assets, shares, project sync, MCP | `@buzzzz/core`   |
| `apps/explainer` | Remotion scenes and narration                       | None             |
| `packages/core`  | Pattern, project, editor metadata, relay validation | None             |

Apps depend on shared packages, never one another. Packages never depend on apps. Fallow checks these boundaries and separates Studio's browser code from server code.

## Source layout

Studio's `src/app` wires the workspace together. `src/features` contains composer, audio, animation, imports, presets, project, connection, activity, Rive, tools, and Learn. Shared controls live in `src/components`, styling in `src/styles`. Audio generation and animation analysis use workers; Sound metric overlays read the decoded mono clip. Import parsers validate external data before application state changes.

Preview's `src/app` contains Expo Router routes. Home, presets, playground, demos, connection, and playback live under `src/features`, with shared components and theme beside them. Relay separates room storage, sessions, sockets, assets, shares, project revisions, and MCP dispatch. Core groups pattern/project models under `src/patterns` and the wire protocol under `src/relay`.

Explainer separates application registration, composition and timing, scene components, shared illustrations, hooks, theme, and narration data. Maintenance scripts use `.mts` in their owning workspace's `scripts` folder. Core owns preset synchronization. Tests live in workspace `__tests__` folders; browser tests live in root `__tests__/browser`.

## Data and media

Core validates patterns with times from 0 to 60,000 milliseconds and amplitude/frequency from 0 to 1. Each point array accepts at most 10,000 entries. A project contains named presets and trigger mappings. Optional per-preset editor state contains markers, play range, and duration.

Studio stores project records in localStorage and media blobs, attachments, and trim windows in IndexedDB. `/studio/projects` lists local projects; `/studio/projects/:id` addresses a record in the same browser. These routes carry no project data or account synchronization. Hosted share URLs and portable exports transfer project data explicitly.

Audio decoding uses Web Audio. Its 12 signal metrics and nine generators follow the inspected Pulsar Studio source. Animation playback uses Lottie's canvas renderer; a worker samples transforms and channels for five generation approaches. They share the validated pattern model with manual editing and native playback. See [analysis limits](development.md#media-analysis).

Project JSON includes patterns, mappings, editor state, and optional embedded Rive. Portable `.pulsar` ZIP exports include original media, trim windows, and a content hash. Public manifest entries use `pulsar.bundle/1`; Buzzzz-specific state lives in a namespaced manifest extension. Referenced files pass format and metadata checks before saving; audio decoding happens when loading a track. Rive imports allow 20 MiB; project JSON allows 32 MiB for base64 round trips. Portable archives additionally bound member count and expanded size.

## Local preview

1. Studio discovers the LAN address through `GET /lan` and creates a `rivehaptics://connect` link.
2. Preview connects to `/relay?role=phone`; Studio connects with `role=studio`.
3. Studio uploads Rive to `POST /riv`, then sends its path and trigger mappings over WebSocket.
4. The phone downloads and plays Rive. View-model triggers play mapped Pulsar patterns and report fired events to Studio.

Metro on port 8082 serves Preview's JavaScript. Studio and the local relay use port 5173. `bun run dev` starts both development tasks through Vite+.

The LAN relay is one unauthenticated development session. Any connected Studio can control every phone. Cross-host browser requests are rejected; native clients without Origin remain allowed. It validates message direction and shape, limits 32 clients and 1 MiB messages, and stores at most ten Rive files/100 MiB in memory. Restarting the server clears uploads. Use it only on a trusted LAN.

## Hosted relay

Studio builds with `VITE_RELAY_URL` to use a separate Cloudflare Worker. SQLite Durable Objects isolate rooms, token hashes, sockets, shares, and project revisions. Private R2 stores assets. Host and phone credentials determine roles; clients cannot choose a role with a query flag.

Pairing uses `rivehaptics://pair`, a room ID, and a single-use code valid for ten minutes. Rooms, tokens, assets, and shares expire after 24 hours. Signed read URLs grant access to whoever holds them. Host-origin checks, rate limits, bounded uploads, and same-room asset checks apply independently of bearer authorization.

Project writes use revisions to reject stale updates. Share snapshots refresh when projects change. Headless MCP tools edit validated projects and control phones. Browser MCP tools delegate audio/animation generation and editor actions to one connected Studio, with bounded arguments, results, and a timeout. See [relay API and deployment](../apps/relay/README.md).

Studio keeps its room and last agreed project revision in per-tab session storage for reload recovery. A Web Lock claims each room before reuse, so a duplicated tab creates its own room. Browsers without Web Locks always create a fresh room. Shared-link revocation credentials stay in local storage so a later tab can revoke links from closed sessions. Clearing this browser's site data removes those credentials; links still expire with their rooms.

Static Studio hosting supplies no local relay. Configure and verify the separate Worker before using hosted pairing or sharing. A deployment dry run and Miniflare tests do not establish live availability.

## Native ownership

Expo generates ignored iOS and Android projects from `apps/preview/app.json` and config plugins. Rebuild after native dependency, patch, or configuration changes. Preview requires a native development build because Expo Go lacks its Rive and Pulsar modules. Simulators can verify UI and connections; haptic output requires physical hardware.

React Native Pulsar remains on 1.7.0 with a local patch. Its native cores come from pinned unreleased source, verified by archive hash. The local iOS 1.4.0 and Android 1.3.0 metadata satisfy dependency constraints; the source pin determines their implementation. See [dependency patches](development.md#dependency-patches) for the revision, checksum, and removal checks.
