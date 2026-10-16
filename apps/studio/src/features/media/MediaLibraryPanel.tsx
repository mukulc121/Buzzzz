import { useState } from "react";
import { FilePicker } from "../../components/FilePicker";
import { Download, Upload, X } from "../../components/icons";
import { mediaUsage } from "./attachments";
import { MEDIA_LIMITS, type IMediaItem, type MediaKind } from "./model";
import type { AttachedTracks } from "./useAttachedTracks";

interface IMediaLibraryPanel {
  media: AttachedTracks;
  onImport: (file: File, kind: MediaKind) => Promise<unknown>;
  onOpenSound: () => void;
  onOpenAnimation: () => void;
}
interface IMediaRow {
  item: IMediaItem;
  media: AttachedTracks;
  onOpen?: () => void;
}

const PICKERS: { kind: MediaKind; label: string; accept: string }[] = [
  { kind: "audio", label: "Audio", accept: "audio/*,.mp3,.wav,.ogg,.m4a,.flac" },
  {
    kind: "animation",
    label: "Animation",
    accept: ".json,.lottie,application/json,application/zip+dotlottie",
  },
  { kind: "rive", label: "Rive", accept: ".riv" },
];
const KIND_LABEL: Record<MediaKind, string> = {
  audio: "Audio · this pattern",
  animation: "Animation · this pattern",
  rive: "Rive · whole project",
};
const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MiB`;

function MediaRow(props: IMediaRow) {
  const { item, media, onOpen } = props;
  const { library, pending } = media;
  const [draft, setDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const attached = library.attachment[item.kind]?.assetId === item.id;
  const busy = Boolean(pending[item.kind]);
  const commit = () => {
    if (draft !== null && draft.trim() !== item.name) void library.rename(item.id, draft);
    setDraft(null);
  };
  return (
    <li className={attached ? "active" : ""}>
      <div className="grow">
        {draft === null ? (
          <button className="preset-select" title="Rename" onClick={() => setDraft(item.name)}>
            <span className="grow">{item.name}</span>
          </button>
        ) : (
          <input
            aria-label={`Rename ${item.name}`}
            value={draft}
            maxLength={MEDIA_LIMITS.nameLength}
            autoFocus
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setDraft(null);
            }}
          />
        )}
        <small>
          {KIND_LABEL[item.kind]} · {formatSize(item.size)}
          {attached && " · attached"}
          {attached && pending[item.kind] === "hydrate" && " · loading…"}
        </small>
        <div className="row">
          {attached ? (
            <>
              {onOpen && <button onClick={onOpen}>Open</button>}
              <button disabled={busy} onClick={() => void media.detach(item.kind)}>
                Detach
              </button>
            </>
          ) : (
            <button disabled={busy} onClick={() => void media.attachAsset(item.id)}>
              Attach
            </button>
          )}
          <button
            className="icon"
            aria-label={`Download ${item.name}`}
            onClick={() => void library.download(item.id)}
          >
            <Download />
          </button>
          {confirming ? (
            <>
              <button
                onClick={() => {
                  setConfirming(false);
                  void library.remove(item.id);
                }}
              >
                Delete
              </button>
              <button onClick={() => setConfirming(false)}>Keep</button>
            </>
          ) : (
            <button
              className="icon"
              aria-label={`Delete ${item.name}`}
              onClick={() => setConfirming(true)}
            >
              <X />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function MediaLibraryPanel(props: IMediaLibraryPanel) {
  const { media, onImport, onOpenSound, onOpenAnimation } = props;
  const { library, pending } = media;
  const usage = mediaUsage(library.items);
  const open: Partial<Record<MediaKind, () => void>> = {
    audio: onOpenSound,
    animation: onOpenAnimation,
  };
  return (
    <section className="panel-content" aria-label="Media library">
      <p className="hint">
        {formatSize(usage.bytes)} of {formatSize(MEDIA_LIMITS.projectBytes)} · {usage.files}/
        {MEDIA_LIMITS.projectFiles} files · stored in this browser
      </p>
      <div className="row">
        {PICKERS.map((picker) => (
          <FilePicker
            key={picker.kind}
            accept={picker.accept}
            className="grow"
            onFile={async (file) => {
              await onImport(file, picker.kind);
            }}
          >
            <Upload /> {pending[picker.kind] === "import" ? "Importing…" : picker.label}
          </FilePicker>
        ))}
      </div>
      {!library.ready ? (
        <p className="hint" role="status">
          Loading media…
        </p>
      ) : library.items.length === 0 ? (
        <p className="hint">
          No media yet. Audio and animation attach to the current pattern; Rive files belong to the
          whole project.
        </p>
      ) : (
        <ul className="list">
          {library.items.map((item) => (
            <MediaRow key={item.id} item={item} media={media} onOpen={open[item.kind]} />
          ))}
        </ul>
      )}
    </section>
  );
}
