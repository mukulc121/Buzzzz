import { useRef, useState } from "react";

interface IPatternRename {
  name: string;
  writable: boolean;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

export function PatternRename(props: IPatternRename) {
  const { name, writable, onCommit, onCancel } = props;
  const [draft, setDraft] = useState(name);
  const finished = useRef(false);
  const commit = () => {
    if (finished.current) return;
    finished.current = true;
    onCommit(draft.trim());
  };
  return (
    <input
      className="pattern-rename"
      aria-label={`Rename ${name}`}
      value={draft}
      readOnly={!writable}
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
          event.preventDefault();
          event.stopPropagation();
          finished.current = true;
          onCancel();
        }
      }}
    />
  );
}
