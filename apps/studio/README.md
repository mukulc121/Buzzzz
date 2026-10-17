# Studio

The browser editor and its Vite+ development relay live here. Run commands from the repository root.

```bash
bun install
bun run dev:studio
bun run build
```

Studio listens on port 5173. `bun run dev` also starts Metro on port 8082 for the native preview app.

- `src/app/` connects the features and handles project imports.
- `src/components/` contains shared controls and icons.
- `src/features/` groups the composer, preset library, phone connection, and Rive playback.
- `src/styles/` contains the editor stylesheet.
- `server/relay.ts` handles WebSocket messages, LAN discovery, and temporary Rive uploads.
- `src/features/presets/data/pulsar-presets.json` contains Pulsar's MIT-licensed presets.
- `__tests__/` contains the Studio unit and relay tests.

To refresh presets from a local Pulsar checkout, run the `scripts/sync-pulsar-presets.mts` task:

```bash
bun run --filter @buzzzz/studio sync-presets /absolute/path/to/pulsar
```

The static build has no relay. Phone pairing requires the development server on a trusted LAN. See the [root README](../../README.md), [architecture](../../docs/architecture.md), and [third-party notices](../../THIRD_PARTY_NOTICES.md).
