import { useState } from "react";

interface IActivityEntry {
  id: number;
  time: string;
  text: string;
}

export function useActivityLog() {
  const [entries, setEntries] = useState<IActivityEntry[]>([]);
  const addLog = (text: string) =>
    setEntries((l) =>
      [
        {
          id: performance.now(),
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          text,
        },
        ...l,
      ].slice(0, 30),
    );

  return { entries, addLog };
}
