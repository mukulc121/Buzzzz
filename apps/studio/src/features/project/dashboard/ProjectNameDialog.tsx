import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "./Modal";

interface IProjectNameDialog {
  name: string | null;
  onSave: (name: string) => Promise<string | null>;
  onClose: () => void;
}

export function ProjectNameDialog(props: IProjectNameDialog) {
  const { name: current, onSave, onClose } = props;
  const creating = current === null;
  const form = useId();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(current ?? "");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => input.current?.select(), []);
  const trimmed = name.trim();
  const empty = trimmed.length === 0;
  const canSave = !empty && trimmed !== current && !busy;
  const invalid = (empty && touched) || Boolean(error);
  const hint = error ?? (empty && touched ? "Name can’t be empty." : null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    const failure = await onSave(trimmed);
    setBusy(false);
    if (failure) setError(failure);
    else onClose();
  };
  return (
    <Modal
      title={creating ? "Create project" : "Rename project"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="dashboard-button ghost"
            disabled={busy}
            onClick={onClose}
          >
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            form={form}
            className="dashboard-button primary"
            disabled={!canSave}
          >
            <span>{busy ? "Saving…" : creating ? "Create" : "Save"}</span>
          </button>
        </>
      }
    >
      <form
        id={form}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) void submit();
        }}
      >
        <label className="dashboard-field" data-invalid={invalid || undefined}>
          <span>Project name</span>
          <input
            ref={input}
            className="dashboard-input"
            value={name}
            disabled={busy}
            aria-invalid={invalid}
            onBlur={() => setTouched(true)}
            onChange={(event) => {
              setTouched(true);
              setName(event.target.value);
            }}
          />
          {hint && <small>{hint}</small>}
        </label>
      </form>
    </Modal>
  );
}
