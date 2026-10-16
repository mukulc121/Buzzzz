import { useRef, useState } from "react";
import { patternEnd, type Pattern, type Project } from "@buzzzz/core";
import { ContextMenu } from "../../components/ContextMenu";
import { PatternActionIcon } from "./PatternActionIcon";
import { PatternSymbol } from "./PatternSymbol";

interface IPatternListItem {
  preset: Project["presets"][number];
  active: boolean;
  writable: boolean;
  canRemove: boolean;
  triggers: string[];
  onSelect: (id: string) => void;
  onAdd: (pattern?: Pattern, name?: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}
export function PatternListItem(props: IPatternListItem) {
  const { preset, active, writable, canRemove, triggers, onSelect, onAdd, onRename, onRemove } =
    props;
  const button = useRef<HTMLButtonElement>(null);
  const renamed = useRef(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const duration = Math.max(patternEnd(preset.pattern), preset.editor?.durationMs ?? 0);
  const commit = () => {
    if (renamed.current) return;
    renamed.current = true;
    if (writable && draft?.trim()) onRename(preset.id, draft.trim());
    setDraft(null);
  };
  return (
    <li className="pattern-list-row">
      {draft !== null ? (
        <input
          className="pattern-rename"
          aria-label={`Rename ${preset.name}`}
          value={draft}
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
              renamed.current = true;
              setDraft(null);
            }
          }}
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
              {Math.round(duration)} ms · {preset.pattern.discretePattern.length} discrete
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
              onSelect: () => {
                renamed.current = false;
                setDraft(preset.name);
              },
            },
            {
              label: "Duplicate",
              icon: <PatternActionIcon name="duplicate" />,
              disabled: !writable,
              onSelect: () => onAdd(structuredClone(preset.pattern), `${preset.name} copy`),
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
