import { useEffect, useEffectEvent, useState } from "react";
import { listAttachments } from "../media/repository";
import type { IMediaAttachment, IMediaItem, MediaKind } from "../media/model";

interface IExportAttachments {
  projectId: string;
  presetIds: readonly string[];
  items: readonly IMediaItem[];
  attachment: Partial<Record<MediaKind, IMediaAttachment>>;
}

export function useExportAttachments(props: IExportAttachments) {
  const [snapshot, setSnapshot] = useState<{
    key: string;
    kinds: Record<string, MediaKind[]>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([props.projectId, props.presetIds]);
  const read = useEffectEvent(async () =>
    Object.fromEntries(
      await Promise.all(
        props.presetIds.map(async (id): Promise<[string, MediaKind[]]> => [
          id,
          (await listAttachments(props.projectId, id)).map((item) => item.kind),
        ]),
      ),
    ),
  );
  useEffect(() => {
    let active = true;
    void read().then(
      (kinds) => {
        if (active) {
          setSnapshot({ key, kinds });
          setError(null);
        }
      },
      (failure: unknown) => {
        if (active)
          setError(failure instanceof Error ? failure.message : "Could not load attached files.");
      },
    );
    return () => {
      active = false;
    };
  }, [key, props.items, props.attachment]);
  return { kinds: snapshot?.key === key ? snapshot.kinds : {}, error };
}
