import { useCallback, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { ContextMenu } from "../../components/ContextMenu";
import { ToolIcon } from "../../components/ToolIcon";
import { LibraryThumbnail } from "../presets/LibraryThumbnail";
import { writePresetDrag } from "../presets/drag";
import type { ISnippet } from "./snippetsStore";

interface ISnippetRow {
  snippet: ISnippet;
  canEdit: boolean;
  onAppend: (pattern: Pattern) => void;
  onInspect: (snippet: ISnippet) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}
export function SnippetRow(props: ISnippetRow) {
  const { snippet, canEdit, onAppend, onInspect, onRename, onRemove } = props;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(snippet.name);
  const focusName = useCallback((element: HTMLInputElement | null) => {
    element?.focus();
    element?.select();
  }, []);
  const rename = () => {
    const label = name.trim();
    if (label && label !== snippet.name) onRename(snippet.id, label);
    setRenaming(false);
  };
  if (renaming)
    return (
      <li className="library-row">
        <input
          aria-label="Snippet name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          onBlur={rename}
          onKeyDown={(event) => {
            if (event.key === "Enter") rename();
            if (event.key === "Escape") setRenaming(false);
          }}
          ref={focusName}
        />
      </li>
    );
  return (
    <>
      <li
        className="library-row"
        draggable={canEdit}
        title={`${snippet.name} - drag onto the chart, or use + to append`}
        onDragStart={(event) =>
          writePresetDrag(event.dataTransfer, {
            ...snippet,
            duration: snippet.durationMs,
            description: "",
            tags: [],
          })
        }
        onContextMenu={(event) => {
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
        onKeyDown={(event) => {
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            setMenu({ x: bounds.left, y: bounds.bottom });
          }
        }}
      >
        <LibraryThumbnail pattern={snippet.pattern} />
        <span className="library-row-text">
          <span className="library-row-name">{snippet.name}</span>
          <span className="library-row-meta">
            {snippet.durationMs === 0 ? "Instant" : `${snippet.durationMs} ms`}
          </span>
        </span>
        <span className="library-row-actions">
          <button
            type="button"
            className="icon"
            aria-label={`About ${snippet.name}`}
            onClick={() => onInspect(snippet)}
          >
            <ToolIcon name="info" />
          </button>
          <button
            type="button"
            className="icon library-append"
            aria-label={`Append ${snippet.name} to the pattern`}
            disabled={!canEdit}
            onClick={() => onAppend(snippet.pattern)}
          >
            <ToolIcon name="plus" />
          </button>
        </span>
      </li>
      {menu && (
        <ContextMenu
          {...menu}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Rename",
              icon: null,
              onSelect: () => {
                setName(snippet.name);
                setRenaming(true);
              },
            },
            { separator: true },
            {
              label: "Remove",
              icon: <ToolIcon name="close" />,
              danger: true,
              onSelect: () => onRemove(snippet.id),
            },
          ]}
        />
      )}
    </>
  );
}
