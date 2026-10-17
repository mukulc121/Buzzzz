import { useRef, useState } from "react";
import { ContextMenu } from "./ContextMenu";
import { PatternActionIcon } from "../features/project/PatternActionIcon";
import { PatternSymbol } from "../features/project/PatternSymbol";

interface IPatternTitle {
  name?: string;
  renaming: boolean;
  writable: boolean;
  onStartRename: () => void;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

interface IPatternTitleInput {
  initial: string;
  writable: boolean;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

function PatternTitleInput(props: IPatternTitleInput) {
  const { initial, writable, onCommit, onCancel } = props;
  const [draft, setDraft] = useState(initial);
  const finished = useRef(false);
  const commit = () => {
    if (finished.current) return;
    finished.current = true;
    onCommit(draft);
  };
  return (
    <input
      className="pattern-title-input"
      value={draft}
      readOnly={!writable}
      autoFocus
      aria-label="Pattern name"
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        else if (event.key === "Escape") {
          finished.current = true;
          onCancel();
        }
      }}
    />
  );
}

export function PatternTitle(props: IPatternTitle) {
  const { name, renaming, writable, onStartRename, onCommit, onCancel } = props;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const startRename = () => {
    if (writable) onStartRename();
  };
  const commit = (draft: string) => {
    const next = draft.trim();
    if (writable && next && next !== name) onCommit(next);
    onCancel();
  };
  if (name === undefined)
    return (
      <div className="pattern-current">
        <span className="pattern-current-empty">No pattern open</span>
      </div>
    );
  return (
    <div className="pattern-current">
      <PatternSymbol className="pattern-current-icon" size={16} />
      {renaming ? (
        <PatternTitleInput
          initial={name}
          writable={writable}
          onCommit={commit}
          onCancel={onCancel}
        />
      ) : (
        <h1
          className="pattern-title"
          title={`${name} - double-click to rename`}
          aria-disabled={!writable || undefined}
          onDoubleClick={startRename}
          onContextMenu={(event) => {
            event.preventDefault();
            setMenu({ x: event.clientX, y: event.clientY });
          }}
        >
          {name}
        </h1>
      )}
      {menu && (
        <ContextMenu
          {...menu}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Rename",
              icon: <PatternActionIcon name="rename" />,
              disabled: !writable,
              onSelect: startRename,
            },
          ]}
        />
      )}
    </div>
  );
}
