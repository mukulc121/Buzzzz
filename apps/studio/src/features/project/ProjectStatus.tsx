import type { TConflictChoice, TProjectStatus } from "./model";

interface IProjectStatus {
  status: TProjectStatus;
  storageError: string | null;
  onTakeOver: () => void;
  onResolve: (choice: TConflictChoice) => void;
}

const LABEL: Record<TProjectStatus, string> = {
  opening: "Opening…",
  editing: "✓ Saved",
  "read-only": "Read only: open in another window",
  "taken-over": "Read only: another window took over",
  conflict: "Another window changed this project",
  "storage-error": "Not saved",
  unlocked: "✓ Saved",
};

export function ProjectStatus(props: IProjectStatus) {
  const { status, storageError, onTakeOver, onResolve } = props;
  return (
    <div className="save-status" role="status" data-status={status}>
      <span>{LABEL[status]}</span>
      {status === "storage-error" && storageError && <small>{storageError}</small>}
      {(status === "read-only" || status === "taken-over") && (
        <button onClick={onTakeOver}>Edit here instead</button>
      )}
      {status === "conflict" && (
        <span className="row">
          <button onClick={() => onResolve("keep-mine")}>Keep mine</button>
          <button onClick={() => onResolve("use-theirs")}>Use theirs</button>
          <button onClick={() => onResolve("save-copy")}>Save mine as copy</button>
        </span>
      )}
    </div>
  );
}
