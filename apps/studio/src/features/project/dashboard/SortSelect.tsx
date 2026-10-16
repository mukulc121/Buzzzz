import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { DashboardIcon } from "./DashboardIcon";
import type { TProjectSort } from "../model";

const OPTIONS: { label: string; value: TProjectSort }[] = [
  { label: "Last edited", value: "updated" },
  { label: "Name", value: "name" },
];

interface ISortSelect {
  value: TProjectSort;
  onChange: (value: TProjectSort) => void;
}

export function SortSelect(props: ISortSelect) {
  const { value, onChange } = props;
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selected);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const show = () => {
    setActive(selected);
    setOpen(true);
  };
  const choose = (index: number) => {
    onChange(OPTIONS[index]!.value);
    setOpen(false);
    trigger.current?.focus();
  };
  const keys = (event: KeyboardEvent) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      if (!open) show();
      else setActive((index) => Math.min(OPTIONS.length - 1, Math.max(0, index + step)));
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(active);
    } else if (open && event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };
  return (
    <div ref={root} className="sort-select">
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label="Sort projects"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        className="sort-select-trigger"
        data-open={open || undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keys}
      >
        <span className="sort-select-value">
          <span className="sort-select-prefix">Sort:</span>
          {OPTIONS[selected]!.label}
        </span>
        <DashboardIcon name="chevron" className="sort-select-chevron" />
      </button>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Sort projects"
          className="sort-select-popup"
        >
          {OPTIONS.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === selected}
              data-active={index === active || undefined}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {index === selected && <DashboardIcon name="check" size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
