import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Layer, Selection } from "../features/composer/model";
import { readImport } from "./imports";
import { Header } from "./Header";
import { ActivityPanel } from "../features/activity/ActivityPanel";
import { useActivityLog } from "../features/activity/useActivityLog";
import { useTheme } from "./useTheme";
import { ProjectSidebar } from "../features/project/ProjectSidebar";
import { useProject } from "../features/project/useProject";
import { PatternEditor } from "../features/composer/PatternEditor";
import { RivePanel } from "../features/rive/RivePanel";
import { Device } from "../features/connection/Device";
import { X } from "../components/icons";
import { playSound, stopSound } from "../features/composer/audio";
import { useRelay } from "../features/connection/useRelay";
import { useRive } from "../features/rive/useRive";
import {
  isRecord,
  MAX_PATTERN_MS,
  patternEnd,
  toDevice,
  type Msg,
  type Pattern,
} from "@buzzzz/core";

export default function App() {
  const {
    project,
    preset,
    pattern,
    mapped,
    begin,
    undo: undoProject,
    setProject,
    setPattern,
    addPreset: addProjectPreset,
    removePreset,
    rename,
    selectPreset,
    openProject,
  } = useProject();
  const { theme, setTheme } = useTheme();
  const [layer, setLayer] = useState<Layer>("amplitude");
  const [selected, setSelected] = useState<Selection>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [sound, setSound] = useState(true);
  const [onPhone, setOnPhone] = useState(true);
  const { entries, addLog } = useActivityLog();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRows = useRef(new Map<string, HTMLDivElement>());

  // Rive
  const canvas = useRef<HTMLCanvasElement>(null);
  const [riv, setRiv] = useState<{ name: string; buffer: ArrayBuffer } | null>(null);
  const [requestedStateMachine, setStateMachine] = useState<string>();

  const undo = () => {
    if (undoProject()) setSelected(null);
  };

  // Restart the row's highlight so you can see which slot just fired.
  const flash = (name: string) => {
    const el = triggerRows.current.get(name);
    if (!el) return;
    el.classList.remove("fired");
    void el.offsetWidth;
    el.classList.add("fired");
  };

  // Relay
  const { phones, connected, joinVersion, send } = useRelay((m: Msg) => {
    if (m.type === "hello") {
      addLog(`Phone joined · ${m.device}`);
    }
    if (m.type === "fired") {
      addLog(`Phone fired “${m.name}”`);
      flash(m.name);
    }
  });

  const { info, fire, restart, paused, setPause, ready, stateMachine } = useRive(
    canvas,
    riv?.buffer ?? null,
    requestedStateMachine,
    (name) => {
      addLog(`Studio fired “${name}”`);
      flash(name);
      const p = project.presets.find((x) => x.id === project.map[name]);
      if (p && sound) playSound(p.pattern);
    },
  );

  const hasPhones = phones > 0;
  const publishLoad = useEffectEvent((path: string) =>
    send({ type: "load", riv: path, stateMachine, map: mapped }),
  );
  useEffect(() => {
    if (!hasPhones || !riv || !ready) return;
    const buffer = riv.buffer;
    const controller = new AbortController();
    async function upload() {
      try {
        const response = await fetch("/riv", {
          method: "POST",
          body: buffer,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await response.text());
        const data: unknown = await response.json();
        if (!isRecord(data) || typeof data.path !== "string")
          throw new Error("Invalid upload response");
        if (!controller.signal.aborted) publishLoad(data.path);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Could not send Rive file");
      }
    }
    void upload();
    return () => controller.abort();
  }, [riv, stateMachine, ready, hasPhones, joinVersion]);
  useEffect(() => {
    send({ type: "map", map: mapped });
  }, [mapped, send]);

  // Playback
  const raf = useRef(0);
  const play = (p: Pattern) => {
    cancelAnimationFrame(raf.current);
    stopSound();
    if (sound) playSound(p);
    if (onPhone && phones) send({ type: "play", pattern: toDevice(p) });
    const end = patternEnd(p);
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      setPlayhead(t <= end ? t : null);
      if (t <= end) raf.current = requestAnimationFrame(tick);
    };
    tick();
  };
  const stop = () => {
    cancelAnimationFrame(raf.current);
    stopSound();
    send({ type: "stop" });
    setPlayhead(null);
  };
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      stopSound();
    },
    [],
  );

  // Keyboard: delete point, undo, play
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input, select, textarea, [contenteditable]")
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        begin();
        const p = structuredClone(pattern);
        if (selected.layer === "discrete") p.discretePattern.splice(selected.index, 1);
        else p.continuousPattern[selected.layer].splice(selected.index, 1);
        setPattern(p);
        setSelected(null);
      } else if (
        e.key === " " &&
        !(e.target instanceof HTMLElement && e.target.closest("button"))
      ) {
        e.preventDefault();
        if (playhead === null) play(pattern);
        else stop();
      } else if (e.key === "1") setLayer("amplitude");
      else if (e.key === "2") setLayer("frequency");
      else if (e.key === "3") setLayer("discrete");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Presets
  const addPreset = (value?: Pattern, name?: string) => {
    addProjectPreset(value, name);
    setSelected(null);
  };

  const importFile = async (file: File) => {
    try {
      const data = await readImport(file);
      switch (data.kind) {
        case "rive":
          setStateMachine(undefined);
          setRiv(data.riv);
          break;
        case "pattern":
          addPreset(data.pattern, data.name);
          break;
        case "project":
          openProject(data.project);
          setSelected(null);
          setStateMachine(data.stateMachine);
          setRiv(data.riv);
          addLog(`Opened project · ${data.project.presets.length} patterns`);
          break;
      }
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read " + file.name);
    }
  };

  // Inspector
  const editSel = (field: string, v: number) => {
    if (!selected || !Number.isFinite(v)) return;
    const p = structuredClone(pattern);
    const target =
      selected.layer === "discrete"
        ? p.discretePattern[selected.index]
        : p.continuousPattern[selected.layer][selected.index];
    if (!target) return;
    if (field === "time") target.time = Math.min(MAX_PATTERN_MS, Math.max(0, v));
    else if (field === "value" && "value" in target)
      target.value = Math.min(1, Math.max(0, v / 100));
    else if (field === "amplitude" && "amplitude" in target)
      target.amplitude = Math.min(1, Math.max(0, v / 100));
    else if (field === "frequency" && "frequency" in target)
      target.frequency = Math.min(1, Math.max(0, v / 100));
    setPattern(p);
  };

  const playing = playhead !== null;
  async function importFiles(files: FileList) {
    for (const file of files) await importFile(file);
  }

  return (
    <div
      className="shell"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.relatedTarget) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void importFiles(e.dataTransfer.files);
      }}
    >
      <Header phones={phones} connected={connected} theme={theme} setTheme={setTheme} />

      {error && (
        <div className="notice" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            <X />
          </button>
        </div>
      )}
      <div className="app">
        <ProjectSidebar
          project={project}
          preset={preset}
          onPreview={play}
          onAdd={addPreset}
          onSelect={(id) => {
            selectPreset(id);
            setSelected(null);
          }}
          onRemove={removePreset}
          onImport={importFile}
          riv={riv}
          stateMachine={stateMachine}
        />

        <main className="col main">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">Pattern composer</span>
              <h1>Make it feel right.</h1>
            </div>
            <span className="format-tag">Pulsar format</span>
          </div>
          <PatternEditor
            name={preset.name}
            rename={rename}
            sound={sound}
            setSound={setSound}
            phones={phones}
            onPhone={onPhone}
            setOnPhone={setOnPhone}
            playing={playing}
            stop={stop}
            play={play}
            pattern={pattern}
            layer={layer}
            setLayer={setLayer}
            selected={selected}
            setSelected={setSelected}
            playhead={playhead}
            begin={begin}
            setPattern={setPattern}
            editSel={editSel}
          />
          <div className="editor-note">
            <span>Draw a pattern. Map a trigger. Feel it on your phone.</span>
            <span>Changes saved on this browser</span>
          </div>
          <RivePanel
            riv={riv}
            canvas={canvas}
            info={info}
            stateMachine={stateMachine}
            setStateMachine={setStateMachine}
            importFile={importFile}
            restart={restart}
            send={send}
            addLog={addLog}
            paused={paused}
            setPause={setPause}
            project={project}
            begin={begin}
            setProject={setProject}
            triggerRows={triggerRows}
            fire={fire}
          />
        </main>

        <aside className="col right">
          <Device phones={phones} />

          <ActivityPanel entries={entries} />
        </aside>
      </div>

      <div className={dragging ? "drop-overlay on" : "drop-overlay"} aria-hidden>
        <div>
          Drop a <b>.riv</b>, a Pulsar pattern <b>.json</b>, or a project file
        </div>
      </div>
    </div>
  );
}
