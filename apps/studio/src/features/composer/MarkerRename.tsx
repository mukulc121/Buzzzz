import { useEffect, useRef, useState } from "react";

interface IMarkerRename {
  label: string;
  onCommit: (label: string) => void;
  onClose: () => void;
}

export function MarkerRename(props: IMarkerRename) {
  const [label, setLabel] = useState(props.label);
  const input = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => input.current?.select(), []);
  const close = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (commit) props.onCommit(label.trim());
    props.onClose();
  };
  return (
    <input
      ref={input}
      autoFocus
      className="chart-marker-rename"
      aria-label="Marker label"
      value={label}
      maxLength={60}
      onChange={(event) => setLabel(event.target.value)}
      onBlur={() => close(true)}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") close(true);
        else if (event.key === "Escape") close(false);
      }}
    />
  );
}
