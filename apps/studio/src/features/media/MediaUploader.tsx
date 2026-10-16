import { useEffect, useRef, useState } from "react";
import { Upload } from "../../components/icons";

interface IMediaUploader {
  onImport: (file: File) => Promise<unknown>;
  onClose: () => void;
}

export function MediaUploader(props: IMediaUploader) {
  const { onImport, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const upload = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    setBusy(true);
    try {
      for (const file of files) await onImport(file);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="media-upload-dialog"
      aria-labelledby="media-upload-title"
      onCancel={onClose}
    >
      <header>
        <h2 id="media-upload-title">Upload media</h2>
        <button className="icon" aria-label="Close upload" disabled={busy} onClick={onClose}>
          ×
        </button>
      </header>
      <div className="media-upload-body">
        <button
          className="media-drop-area"
          data-dragging={dragging}
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
            void upload(event.dataTransfer.files);
          }}
        >
          <Upload />
          <strong>{busy ? "Importing…" : "Drag files here"}</strong>
          <span className="hint">
            or click to browse · Audio, Lottie (.json/.lottie), or Rive (.riv)
          </span>
        </button>
        <input
          ref={input}
          aria-label="Media files"
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.json,.lottie,.riv,application/json,application/zip+dotlottie"
          multiple
          hidden
          onChange={(event) => void upload(event.currentTarget.files)}
        />
      </div>
      <footer>
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button className="primary" disabled={busy} onClick={() => input.current?.click()}>
          Choose files
        </button>
      </footer>
    </dialog>
  );
}
