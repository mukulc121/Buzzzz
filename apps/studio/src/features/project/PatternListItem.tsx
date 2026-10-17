import { useRef, useState } from "react";
import { patternEnd, type Project } from "@buzzzz/core";
import { ContextMenu } from "../../components/ContextMenu";
import { PatternActionIcon } from "./PatternActionIcon";
import { PatternSymbol } from "./PatternSymbol";
import { PatternRename } from "./PatternRename";

interface IPatternListItem {
  preset: Project["presets"][number];
  active: boolean;
  writable: boolean;
  renaming: boolean;
  canRemove: boolean;
  triggers: string[];
  metadata?: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartRename: (id: string) => void;
  onCancelRename: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}
export function PatternListItem(props: IPatternListItem) {
  const {
    preset,
    active,
    writable,
    renaming,
    canRemove,
    triggers,
    metadata,
    onSelect,
    onDuplicate,
    onStartRename,
    onCancelRename,
    onRename,
    onRemove,
  } = props;
  const button = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const duration = Math.max(patternEnd(preset.pattern), preset.editor?.durationMs ?? 0);
  return (
    <li className="pattern-list-row">
      {renaming ? (
        <PatternRename
          name={preset.name}
          writable={writable}
          onCommit={(name) => onRename(preset.id, name)}
          onCancel={onCancelRename}
        />
      ) : (
        <button
          ref={button}
          type="button"
          className="pattern-select"
          aria-label={preset.name}
          aria-pressed={active}
          aria-current={active}
          title={triggers.length ? `${preset.name} · ${triggers.join(", ")}` : preset.name}
          onClick={() => onSelect(preset.id)}
          onContextMenu={(event) => {
            event.preventDefault();
            setMenu({ x: event.clientX, y: event.clientY });
          }}
          onKeyDown={(event) => {
            if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            setMenu({ x: bounds.left + 16, y: bounds.top + 16 });
          }}
        >
          <PatternSymbol size={16} />
          <span className="pattern-row-text">
            <span className="pattern-row-name">{preset.name}</span>
            <span className="pattern-row-meta">
              {metadata ??
                `${Math.round(duration)} ms · ${preset.pattern.discretePattern.length} discrete`}
            </span>
          </span>
        </button>
      )}
      {menu && (
        <ContextMenu
          {...menu}
          onClose={() => {
            setMenu(null);
            button.current?.focus();
          }}
          items={[
            {
              label: "Rename",
              icon: <PatternActionIcon name="rename" />,
              disabled: !writable,
              onSelect: () => onStartRename(preset.id),
            },
            {
              label: "Duplicate",
              icon: <PatternActionIcon name="duplicate" />,
              disabled: !writable,
              onSelect: () => onDuplicate(preset.id),
            },
            { separator: true },
            {
              label: "Remove",
              icon: <PatternActionIcon name="remove" />,
              danger: true,
              disabled: !writable || !canRemove,
              onSelect: () => onRemove(preset.id),
            },
          ]}
        />
      )}
    </li>
  );
}
