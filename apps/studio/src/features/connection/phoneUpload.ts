import { sha256 } from "../../crypto";
import { isRecord } from "@buzzzz/core";
import type { IRoom } from "./cloud";

export interface IPhoneUploadTarget {
  origin: string;
  uploadOrigin?: string;
  roomId: string;
  hostToken: string;
}

export type TPhoneClip = {
  clipId: string;
  downloadUrl: string;
  contentType: string;
  size: number;
};

function readTarget(value: unknown): IPhoneUploadTarget {
  if (
    !isRecord(value) ||
    typeof value.origin !== "string" ||
    typeof value.roomId !== "string" ||
    !/^[a-f0-9]{32}$/.test(value.roomId) ||
    typeof value.hostToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.hostToken)
  )
    throw new Error("Invalid phone media session");
  const origin = new URL(value.origin);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.origin !== value.origin ||
    origin.username ||
    origin.password ||
    origin.hash ||
    origin.search
  )
    throw new Error("Invalid phone media origin");
  return { origin: origin.origin, roomId: value.roomId, hostToken: value.hostToken };
}

export async function phoneUploadTarget(room: IRoom | null, signal: AbortSignal) {
  if (room) {
    const origin = new URL(room.relayUrl);
    if (!["ws:", "wss:"].includes(origin.protocol)) throw new Error("Invalid pairing room");
    origin.protocol = origin.protocol === "wss:" ? "https:" : "http:";
    return readTarget({ ...room, origin: origin.origin });
  }
  const response = await fetch("/media/session", { method: "POST", signal });
  if (!response.ok) throw new Error("Could not start phone media delivery");
  return { ...readTarget(await response.json()), uploadOrigin: "" };
}

export function createPhoneUpload(target: IPhoneUploadTarget) {
  const uploads = new Map<
    string,
    { pending: Promise<TPhoneClip>; signal: AbortSignal; complete: boolean }
  >();
  return async function upload(
    file: File,
    contentType: string,
    signal: AbortSignal,
  ): Promise<TPhoneClip> {
    signal.throwIfAborted();
    const buffer = await file.arrayBuffer();
    signal.throwIfAborted();
    const clipId = await sha256(buffer);
    signal.throwIfAborted();
    const key = `${clipId}/${contentType}`;
    let request = uploads.get(key);
    if (!request || (request.signal.aborted && !request.complete)) {
      const pending = (async () => {
        const response = await fetch(
          `${target.uploadOrigin ?? target.origin}/v1/rooms/${target.roomId}/assets?kind=media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${target.hostToken}`,
              "Content-Type": contentType,
            },
            body: buffer,
            signal,
          },
        );
        if (!response.ok) throw new Error("Phone media upload failed");
        const data: unknown = await response.json();
        if (
          !isRecord(data) ||
          typeof data.assetId !== "string" ||
          !/^[a-f0-9]{32}\.bin$/.test(data.assetId) ||
          data.bytes !== file.size ||
          typeof data.path !== "string"
        )
          throw new Error("Invalid phone media upload");
        const url = new URL(data.path);
        if (
          url.origin !== target.origin ||
          url.pathname !== `/v1/rooms/${target.roomId}/assets/${data.assetId}` ||
          !/^\?token=[A-Za-z0-9_-]{43}$/.test(url.search) ||
          url.username ||
          url.password ||
          url.hash
        )
          throw new Error("Phone media belongs to another room");
        return { clipId, downloadUrl: url.href, contentType, size: file.size };
      })();
      const entry = { pending, signal, complete: false };
      uploads.set(key, entry);
      request = entry;
      void pending.then(
        () => {
          entry.complete = true;
        },
        () => {
          if (uploads.get(key) === entry) uploads.delete(key);
        },
      );
    }
    try {
      const clip = await request.pending;
      signal.throwIfAborted();
      return clip;
    } catch (error) {
      signal.throwIfAborted();
      if (request.signal.aborted) return upload(file, contentType, signal);
      throw error;
    }
  };
}
