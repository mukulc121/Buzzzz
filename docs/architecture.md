# Architecture

Buzzzz has three apps and one shared package. Bun installs and runs the workspaces from the repository root.

| Workspace        | Owns                                         | Internal imports |
| ---------------- | -------------------------------------------- | ---------------- |
| `apps/studio`    | Browser editor, Rive canvas, local relay     | `@buzzzz/core`   |
| `apps/preview`   | Native Rive playback, haptics, connection UI | `@buzzzz/core`   |
| `apps/explainer` | Remotion scenes and narration                | None             |
| `packages/core`  | Pattern, project, and message validation     | None             |

Apps depend on shared packages. Packages never depend on apps, and apps do not import one another. Fallow enforces these directions. It also separates Studio's browser code from its server code.

## Source layout

Studio's `src/app` connects features and handles project imports. Shared controls live in `src/components`. Composer, preset, connection, and Rive code live in separate folders under `src/features`; CSS lives in `src/styles`. The composer's local model owns selection and layer types. Shared pattern and message types come directly from `@buzzzz/core`.

The preview app separates its app, components, connection/playback features, and theme. Core groups pattern/project models under `src/patterns` and the wire protocol under `src/relay`. Tests stay in each workspace's `__tests__` folder; browser tests live in the root `__tests__/browser`.

Studio's project feature owns persistence, history, preset changes, and import/export controls. The activity feature owns its log and panel. Explainer separates its composition, nine scenes, shared illustrations, timing, theme, and narration data; maintenance scripts live under each app's `scripts` folder.

## Pattern and project data

`packages/core` defines the Pulsar pattern format and validates imported projects and relay messages. Times run from 0 to 60,000 milliseconds. Amplitude and frequency run from 0 to 1. Each point array allows at most 10,000 entries.

Studio keeps patterns and trigger mappings in local storage. A project export also embeds the optional Rive file. A pattern export sorts points and normalizes values for Pulsar playback.

Rive imports allow 20 MiB. Project JSON imports allow 32 MiB so a 20 MiB Rive file can round-trip after base64 encoding.

## Preview flow

1. Studio discovers the computer's LAN address through `GET /lan` and creates a `rivehaptics://connect` pairing link.
2. The preview app connects to `/relay?role=phone`. Studio connects with `role=studio`.
3. Studio uploads a Rive file to `POST /riv`, then sends its temporary path and trigger mappings over WebSocket.
4. The phone downloads the file and plays it with the native Rive runtime. View-model triggers play their mapped Pulsar patterns.
5. The phone reports fired triggers to Studio's activity log. Studio can also request playback, pause, restart, or a trigger.

Metro on port 8082 serves the preview app's JavaScript. The Vite+ server on port 5173 serves Studio and the relay. `bun run dev` uses Vite+'s task runner to start both workspace development tasks in parallel.

## Trust and storage

The relay is an unauthenticated, shared development session. There are no user accounts or isolated pairing rooms. Any connected Studio can send commands to every phone. Use it only on a trusted LAN.

The relay rejects browser requests with an Origin host that differs from the request's Host. Vite CORS is disabled. Native requests without an Origin are allowed. These checks limit browser access; they do not authenticate a client.

The server validates message shape and direction. It accepts at most 32 WebSocket clients and limits messages to 1 MiB. A `.riv` upload must have a Rive header and be at most 20 MiB. The in-memory store holds at most 10 files and 100 MiB; it evicts older files when either bound is reached. Files disappear on server restart.

The relay is a Vite development plugin. A static Studio build has no `/lan`, `/riv`, or `/relay` service. A production relay would need a separate design for authentication, session isolation, storage, and transport security.

A hosted version needs a persistent WebSocket service or an equivalent managed service. Both Studio and the phone would join an authorized session over `wss://`; the phone would fetch Rive assets over HTTPS. Pairing must use the public service address instead of `/lan`, and commands must stay within the paired session. The current shared LAN relay must not be published as that service.

## Native project ownership

Expo generates the iOS and Android projects. Keep native configuration in `apps/preview/app.json` and config plugins, then rebuild. Do not commit or hand-edit the generated native directories.

The native preview uses custom Pulsar and Rive modules, so it needs a native development build. The simulator can show the connection UI and animation. Real haptic output needs a physical device.
