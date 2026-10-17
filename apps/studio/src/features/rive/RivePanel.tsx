import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { Bolt, Play, Stop } from "../../components/icons";
import { FilePicker } from "../../components/FilePicker";
import { resolveRivePresetId, type Msg, type Project } from "@buzzzz/core";
import { riveHapticLabel } from "./hapticAction";
import { normalizeDexConfig } from "../project/starter/rive/normalizeDexConfig";
import { RiveFullscreenControls } from "./RiveFullscreenControls";
interface IRivePanel {
  riv: { name: string; buffer: ArrayBuffer } | null;
  canvas: RefObject<HTMLCanvasElement | null>;
  info: { triggers: string[]; stateMachines: string[] };
  stateMachine: string | undefined;
  setStateMachine: (name: string) => void;
  importFile: (file: File) => Promise<void>;
  restart: () => void;
  send: (message: Msg) => void;
  addLog: (text: string) => void;
  paused: boolean;
  completed: boolean;
  setPause: (paused: boolean) => void;
  project: Project;
  begin: () => void;
  setProject: Dispatch<SetStateAction<Project>>;
  triggerRows: RefObject<Map<string, HTMLDivElement>>;
  fire: (name: string) => void;
}
export function RivePanel(props: IRivePanel) {
  const section = useRef<HTMLElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const {
    riv,
    canvas,
    info,
    stateMachine,
    setStateMachine,
    importFile,
    restart,
    send,
    addLog,
    paused,
    completed,
    setPause,
    project,
    begin,
    setProject,
    triggerRows,
    fire,
  } = props;
  const riveConfig = normalizeDexConfig(project.riveConfig, resolveRivePresetId(project));
  const replay = () => {
    restart();
    send({ type: "restart" });
    addLog("Restarted animation");
  };
  const togglePause = () => {
    if (fullscreen && paused && completed) {
      replay();
      return;
    }
    setPause(!paused);
    send({ type: "pause", paused: !paused });
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement === section.current)
      void document.exitFullscreen().catch(() => setFullscreenError("Could not exit fullscreen"));
  };
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === section.current);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.fullscreenElement !== section.current) return;
      event.preventDefault();
      event.stopPropagation();
      void document.exitFullscreen().catch(() => setFullscreenError("Could not exit fullscreen"));
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", keydown, true);
    };
  }, []);
  return (
    <section ref={section} className="card rive-panel">
      <header className="card-head">
        <h3>Animation & triggers</h3>
        {riv && (
          <button
            aria-label="Fullscreen Rive preview"
            onClick={() => {
              setFullscreenError("");
              void section.current
                ?.requestFullscreen()
                .catch(() => setFullscreenError("Fullscreen is unavailable in this browser"));
            }}
          >
            ⛶ Fullscreen
          </button>
        )}
        {riv && (
          <small className="muted" title={riv.name}>
            {riv.name}
          </small>
        )}
      </header>
      {fullscreenError && (
        <p className="hint" role="status">
          {fullscreenError}
        </p>
      )}
      <div className={riv ? "stage" : "stage empty"}>
        <canvas ref={canvas} className="rive" />
        {!riv && (
          <div className="dropzone">
            <strong>Drop a .riv file</strong>
            <span>Its view-model triggers become haptic slots</span>
            <FilePicker accept=".riv" onFile={importFile} className="button">
              Choose file
            </FilePicker>
          </div>
        )}
      </div>
      {riv && (
        <div className="transport">
          <button
            className="primary grow"
            title="Restart the animation here and on the phone; mapped triggers play their haptics"
            onClick={replay}
          >
            <Play /> Play with haptics
          </button>
          <button onClick={togglePause}>
            {paused ? (
              <>
                <Play /> Resume
              </>
            ) : (
              <>
                <Stop /> Pause
              </>
            )}
          </button>
        </div>
      )}
      {fullscreen && (
        <RiveFullscreenControls
          paused={paused}
          onReplay={replay}
          onPause={togglePause}
          onExit={exitFullscreen}
        />
      )}
      {info.stateMachines.length > 1 && (
        <select
          value={stateMachine ?? info.stateMachines[0]}
          aria-label="State machine"
          onChange={(e) => setStateMachine(e.target.value)}
        >
          {info.stateMachines.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      )}
      {riv && !info.triggers.length && (
        <p className="hint">
          No trigger properties found. In Rive, add a <b>Trigger</b> to the artboard’s view model
          and fire it from the state machine.
        </p>
      )}
      {riv && riveConfig?.haptics && (
        <p className="hint">
          {riveConfig.completion?.phases
            ? "The loader clock plays these Pulsar presets on the phone; the Rive triggers only mark the phases. Haptics as sound previews the same patterns."
            : "Rive-driven system cues run on the phone. Haptics as sound previews the matching system presets through the speaker."}
        </p>
      )}
      {info.triggers.length > 0 && (
        <div className="triggers">
          {info.triggers.map((t) => (
            <div
              key={t}
              className="trigger"
              ref={(el) => {
                if (el) triggerRows.current.set(t, el);
                else triggerRows.current.delete(t);
              }}
              onAnimationEnd={(e) => e.currentTarget.classList.remove("fired")}
            >
              <span className="tname" title={t}>
                {t}
              </span>
              {riveHapticLabel(riveConfig, t) ? (
                <span className="muted">{riveHapticLabel(riveConfig, t)}</span>
              ) : (
                <select
                  value={project.map[t] ?? ""}
                  aria-label={`Pattern for ${t}`}
                  onChange={(e) => {
                    begin();
                    const v = e.target.value;
                    setProject((pr) => {
                      const map = v
                        ? { ...pr.map, [t]: v }
                        : Object.fromEntries(Object.entries(pr.map).filter(([name]) => name !== t));
                      return { ...pr, map };
                    });
                  }}
                >
                  <option value="">No haptic</option>
                  {project.presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="icon"
                aria-label={`Fire ${t}`}
                title="Fire here and on the phone"
                onClick={() => {
                  fire(t);
                  send({ type: "fire", name: t });
                }}
              >
                <Bolt />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
