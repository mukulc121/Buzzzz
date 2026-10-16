import { toDevice, type Msg, type Pattern, type Preset } from "@buzzzz/core";

export type TPhonePreset = Pick<Extract<Msg, { type: "haptic-preset" }>, "resourceId" | "name">;

export function phoneLibrary(presets: readonly Pick<Preset, "id" | "name">[]) {
  return {
    type: "library-manifest",
    presets: presets.map((preset) => ({ resourceId: preset.id, name: preset.name })),
  } satisfies Extract<Msg, { type: "library-manifest" }>;
}

export async function phonePlayback(pattern: Pattern, preset?: TPhonePreset) {
  const device = toDevice(pattern);
  if (!preset) return { type: "play", pattern: device } satisfies Msg;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(device)),
  );
  const version = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return { type: "haptic-preset", ...preset, version, pattern: device } satisfies Msg;
}
