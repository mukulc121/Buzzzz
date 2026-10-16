import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emptyPattern, isProject, toDevice, type Pattern, type Project } from "@buzzzz/core";

const KEY = "rive-haptics-project";
const uid = () => Math.random().toString(36).slice(2, 9);

const starter = (): Project => ({
  presets: [
    {
      id: uid(),
      name: "Thud",
      pattern: {
        discretePattern: [{ time: 0, amplitude: 1, frequency: 0.6 }],
        continuousPattern: {
          amplitude: [
            { time: 0, value: 0.8 },
            { time: 120, value: 0.3 },
            { time: 300, value: 0 },
          ],
          frequency: [
            { time: 0, value: 0.4 },
            { time: 300, value: 0.1 },
          ],
        },
      },
    },
  ],
  map: {},
});

function load(): Project {
  try {
    const p: unknown = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (isProject(p)) return p;
  } catch {
    /* fall through */
  }
  return starter();
}

export function useProject() {
  const [project, setProject] = useState(load);
  const [currentId, setCurrentId] = useState(() => project.presets[0].id);
  const history = useRef<Project[]>([]);
  const preset = project.presets.find((item) => item.id === currentId) ?? project.presets[0];
  const pattern = preset.pattern;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(project));
    } catch {
      /* private mode */
    }
  }, [project]);

  const begin = useCallback(() => {
    history.current.push(structuredClone(project));
    if (history.current.length > 100) history.current.shift();
  }, [project]);

  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      setProject(prev);
      return true;
    }
    return false;
  };

  const setPattern = (p: Pattern) =>
    setProject((pr) => ({
      ...pr,
      presets: pr.presets.map((x) => (x.id === preset.id ? { ...x, pattern: p } : x)),
    }));

  const mapped = useMemo(() => {
    return Object.fromEntries(
      Object.entries(project.map).flatMap(([trigger, id]) => {
        const preset = project.presets.find((item) => item.id === id);
        return preset ? [[trigger, toDevice(preset.pattern)]] : [];
      }),
    );
  }, [project]);

  const addPreset = (p: Pattern = emptyPattern(), name = "Untitled") => {
    begin();
    const id = uid();
    setProject((pr) => ({ ...pr, presets: [...pr.presets, { id, name, pattern: p }] }));
    setCurrentId(id);
  };
  const removePreset = (id: string) => {
    if (project.presets.length === 1) return;
    begin();
    setProject((pr) => ({
      presets: pr.presets.filter((x) => x.id !== id),
      map: Object.fromEntries(Object.entries(pr.map).filter(([, v]) => v !== id)),
    }));
    const next = project.presets.find((item) => item.id !== id);
    if (id === currentId && next) setCurrentId(next.id);
  };
  const rename = (name: string) =>
    setProject((pr) => ({
      ...pr,
      presets: pr.presets.map((x) => (x.id === preset.id ? { ...x, name } : x)),
    }));

  const openProject = (next: Project) => {
    begin();
    setProject(next);
    setCurrentId(next.presets[0].id);
  };

  return {
    project,
    preset,
    pattern,
    mapped,
    begin,
    undo,
    setProject,
    setPattern,
    addPreset,
    removePreset,
    rename,
    selectPreset: setCurrentId,
    openProject,
  };
}
