import type { Msg } from "./protocol.ts";

const HOST_COMMANDS = new Set<Msg["type"]>([
  "load",
  "map",
  "play",
  "stop",
  "fire",
  "restart",
  "pause",
  "library-manifest",
  "haptic-preset",
]);
const PHONE_EVENTS = new Set<Msg["type"]>(["hello", "fired", "library-manifest-request"]);

export function isRelayMessageAllowed(role: "host" | "phone", type: Msg["type"]): boolean {
  return (role === "host" ? HOST_COMMANDS : PHONE_EVENTS).has(type);
}
