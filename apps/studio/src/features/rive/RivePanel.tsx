import { useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Bolt, Play, Stop } from "../../components/icons";
import { FilePicker } from "../../components/FilePicker";
import type { Msg, Project } from "@buzzzz/core";
import { riveHapticAction } from "./hapticAction";
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
    setPause,
    project,
    begin,
    setProject,
    triggerRows,
    fire,
  } = props;
  return (
    <section ref={section} className="card rive-panel">
      <header className="card-head">
        <h3>Animation & triggers</h3>
        {riv && (
          <button
            aria-label="Fullscreen Rive preview"
            onClick={() =>
              void section.current
                ?.requestFullscreen()
                .catch(() => setFullscreenError("Fullscreen is unavailable in this browser"))
            }
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
            onClick={() => {
              restart();
              send({ type: "restart" });
              addLog("Restarted animation");
            }}
          >
            <Play /> Play with haptics
          </button>
          <button
            onClick={() => {
              setPause(!paused);
              send({ type: "pause", paused: !paused });
            }}
          >
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
      {riv && project.riveConfig?.haptics && (
        <p className="hint">
          Rive-driven system cues run on the phone. Haptics as sound previews the matching system
          presets through the speaker.
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
              {riveHapticAction(project.riveConfig?.haptics, t) ? (
                <span className="muted">Rive-driven system cue</span>
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
