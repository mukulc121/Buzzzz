import { useEffect, useState } from "react";
import { isRecord, type Project } from "@buzzzz/core";
import { cloudOrigin, type IRoom } from "./cloud";
import { readShares, updateShare, type IStoredShare } from "./shareStorage";
interface ISharing {
  room: IRoom | null;
  projectId: string;
  project: Project;
  onError: (message: string) => void;
}
export function useSharing(props: ISharing) {
  const { room, projectId, project, onError } = props;
  const origin = cloudOrigin();
  const [stored, setStored] = useState(() => readShares(origin));
  const [busy, setBusy] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState("");
  const shares = [...stored.values()].filter((item) => item.projectId === projectId);
  const share = shares.findLast((item) => item.room.roomId === room?.roomId) ?? null;
  useEffect(() => {
    const refresh = () => setStored(readShares(origin));
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [origin]);
  const request = async (target: IRoom, method: string, path: string, body?: unknown) => {
    if (!origin) throw new Error("Configure a hosted relay to share projects");
    const response = await fetch(`${origin}/v1/rooms/${target.roomId}/shares${path}`, {
      method,
      headers: { Authorization: `Bearer ${target.hostToken}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok && !(method === "DELETE" && [404, 410].includes(response.status)))
      throw new Error("Could not update sharing");
    return response;
  };
  const create = async () => {
    if (!room || !origin) return;
    setBusy(true);
    try {
      const data: unknown = await (await request(room, "POST", "", { project, projectId })).json();
      if (
        !isRecord(data) ||
        typeof data.shareId !== "string" ||
        !/^[a-f0-9]{32}$/.test(data.shareId) ||
        typeof data.token !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(data.token)
      )
        throw new Error("Invalid sharing response");
      const url = new URL(location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("shareRoom", room.roomId);
      url.searchParams.set("shareId", data.shareId);
      url.searchParams.set("shareToken", data.token);
      const key = `${room.roomId}/${projectId}/${data.shareId}`;
      const share = { key, origin, room, projectId, shareId: data.shareId, url: url.href };
      try {
        setStored(updateShare(origin, key, share));
      } catch {
        await request(room, "DELETE", `/${data.shareId}`);
        throw new Error(
          "The link could not be saved for later revocation. Free browser storage and try again.",
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not share project");
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (target: IStoredShare | null = share) => {
    if (!target || !origin) return;
    try {
      await request(target.room, "DELETE", `/${target.shareId}`);
      setStored(updateShare(origin, target.key, null));
      setCopiedUrl("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not revoke link");
    }
  };
  const copy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopiedUrl(share.url);
    } catch {
      onError("Select the link and copy it manually");
    }
  };
  return {
    origin,
    share,
    previous: shares.filter((item) => item.key !== share?.key),
    busy,
    copied: Boolean(share && copiedUrl === share.url),
    create,
    revoke,
    copy,
    canCreate: Boolean(room),
  };
}
export type Sharing = ReturnType<typeof useSharing>;
