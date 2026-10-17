import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { isRecord } from "@buzzzz/core";
import { cloudOrigin, type IRoom } from "./cloud";
interface IPairing {
  key: string;
  revision: number;
  phones: number;
  url: string;
  qr: string;
  error: string;
}
const EMPTY = { url: "", qr: "", error: "" };
export function usePairing(room: IRoom | null, phones: number) {
  const [revision, setRevision] = useState(0);
  const [value, setValue] = useState<IPairing | null>(null);
  const key = room?.roomId ?? "lan";
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const origin = cloudOrigin();
        let url: string;
        let link: string;
        let expiresAt: number | undefined;
        if (origin) {
          if (!room) return;
          const response = await fetch(`${origin}/v1/rooms/${room.roomId}/pairing`, {
            method: "POST",
            headers: { Authorization: `Bearer ${room.hostToken}` },
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Could not refresh the pairing code");
          const data: unknown = await response.json();
          if (
            !isRecord(data) ||
            typeof data.code !== "string" ||
            !/^\d{6}$/.test(data.code) ||
            typeof data.expiresAt !== "number" ||
            !Number.isFinite(data.expiresAt) ||
            data.expiresAt <= Date.now()
          )
            throw new Error("The pairing code is unavailable");
          expiresAt = data.expiresAt;
          link = `rivehaptics://pair?server=${encodeURIComponent(origin)}&room=${room.roomId}&code=${data.code}`;
          url = link;
        } else {
          const response = await fetch("/lan", { signal: controller.signal });
          if (!response.ok) throw new Error("Configure the Cloudflare relay for deployed pairing");
          const data: unknown = await response.json();
          if (!isRecord(data) || typeof data.ip !== "string" || typeof data.port !== "number")
            throw new Error("Could not load pairing details");
          url = `ws://${data.ip}:${data.port}/relay`;
          link = `rivehaptics://connect?url=${encodeURIComponent(url)}`;
        }
        const qr = await QRCode.toDataURL(link, { margin: 1, width: 320 });
        if (controller.signal.aborted) return;
        setValue({ key, revision, phones, url, qr, error: "" });
        if (expiresAt)
          timer = setTimeout(
            () => setRevision((value) => value + 1),
            Math.max(1000, expiresAt - Date.now() - 1000),
          );
      } catch (error) {
        if (!controller.signal.aborted)
          setValue({
            key,
            revision,
            phones,
            ...EMPTY,
            error: error instanceof Error ? error.message : "Pairing unavailable",
          });
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [room, key, revision, phones]);
  const current =
    value?.key === key && value.revision === revision && value.phones === phones ? value : null;
  const code = current?.url.startsWith("rivehaptics://pair")
    ? new URL(current.url).searchParams.get("code")
    : null;
  return {
    ...(current ?? EMPTY),
    code,
    loading: current === null,
    renew: () => setRevision((value) => value + 1),
  };
}
