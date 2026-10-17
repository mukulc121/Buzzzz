import { useRef, useState } from "react";
import { X } from "../../components/icons";
import { ContextMenu } from "../../components/ContextMenu";
import { MediaFileIcon } from "./MediaFileIcon";
import { MediaActionIcon } from "./MediaActionIcon";
import { MEDIA_LIMITS, type IMediaItem, type MediaKind } from "./model";
import { formatMediaSize } from "./formatMediaSize";
import { writeMediaDrag } from "./mediaDrag";
import type { AttachedTracks } from "./useAttachedTracks";
import type { useMediaPreview } from "./useMediaPreview";

interface IMediaRow {
  item: IMediaItem;
  media: AttachedTracks;
  canEdit: boolean;
  onAttach: (id: string) => Promise<boolean>;
  preview: ReturnType<typeof useMediaPreview>;
}
const KIND_LABEL: Record<MediaKind, string> = {
  audio: "Audio · this pattern",
  animation: "Animation · this pattern",
  rive: "Rive",
};
export function MediaRow(props: IMediaRow) {
  const { item, media, canEdit, onAttach, preview } = props;
  const { library, pending } = media;
  const row = useRef<HTMLLIElement>(null);
  const renameFinished = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const attached =
    library.attachment[item.kind]?.assetId === item.id &&
    (item.kind !== "rive" || media.riveAttached);
  const busy = Boolean(pending[item.kind]);
  const editable = canEdit && !busy;
  const playing = preview.playingId === item.id;
  const rename = () => {
    if (editable) {
      renameFinished.current = false;
      setDraft(item.name);
    }
  };
  const commit = () => {
    if (renameFinished.current) return;
    renameFinished.current = true;
    if (editable && draft !== null && draft.trim() !== item.name)
      void library.rename(item.id, draft);
    setDraft(null);
  };
  const items: Parameters<typeof ContextMenu>[0]["items"] = [
    {
      label: "Add to canvas",
      icon: <MediaActionIcon name="canvas" />,
      disabled: !editable,
      onSelect: () => {
        void onAttach(item.id);
      },
    },
    ...(item.kind === "audio"
      ? [
          {
            label: playing ? "Stop" : "Play",
            icon: <MediaActionIcon name={playing ? "pause" : "play"} />,
            disabled: busy,
            onSelect: () => {
              if (playing) preview.stop();
              else void preview.play(item.id);
            },
          },
        ]
      : []),
    { separator: true },
    {
      label: "Download",
      icon: <MediaActionIcon name="download" />,
      disabled: busy,
      onSelect: () => {
        void library.download(item.id);
      },
    },
    { separator: true },
    {
      label: "Rename",
      icon: <MediaActionIcon name="rename" />,
      disabled: !editable,
      onSelect: rename,
    },
    {
      label: "Delete",
      icon: <MediaActionIcon name="delete" />,
      danger: true,
      disabled: !editable,
      onSelect: () => {
        void library.remove(item.id);
      },
    },
  ];
  return (
    <li
      ref={row}
      className="media-item"
      data-playing={playing}
      tabIndex={0}
      draggable={editable && draft === null}
      onDragStart={(event) => {
        if (!editable || draft !== null) {
          event.preventDefault();
          return;
        }
        writeMediaDrag(event.dataTransfer, item);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
      onDoubleClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button,input")) return;
        rename();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        setMenu({ x: bounds.left + 16, y: bounds.top + 16 });
      }}
    >
      {draft !== null ? (
        <input
          aria-label={`Rename ${item.name}`}
          value={draft}
          maxLength={MEDIA_LIMITS.nameLength}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              event.stopPropagation();
              renameFinished.current = true;
              setDraft(null);
              row.current?.focus();
            }
          }}
        />
      ) : (
        <>
          <span className="media-file-icon">
            {playing ? (
              <MediaActionIcon name="pause" size={18} />
            ) : (
              <MediaFileIcon kind={item.kind} />
            )}
          </span>
          <div className="grow">
            <span className="media-row-name" title={item.name}>
              {item.name}
            </span>
            <small>
              {formatMediaSize(item.size)} · {KIND_LABEL[item.kind]}
              {attached && " · attached"}
              {attached && pending[item.kind] === "hydrate" && " · loading…"}
              <span className="media-storage-badge" title="Stored in this browser only">
                Browser
              </span>
            </small>
          </div>
          <button
            type="button"
            className="icon media-remove"
            aria-label={`Remove ${item.name}`}
            title={`Remove ${item.name}`}
            disabled={!editable}
            onClick={() => {
              void library.remove(item.id);
            }}
          >
            <X />
          </button>
        </>
      )}
      {menu && (
        <ContextMenu
          {...menu}
          items={items}
          onClose={() => {
            setMenu(null);
            row.current?.focus();
          }}
        />
      )}
    </li>
  );
}
