import { resolveRivePresetId } from "@buzzzz/core";
import { Bolt, Play, Stop } from "../../components/icons";
import { InspectorSection } from "../../components/InspectorSection";
import { AnimationPreviewLayout } from "../animation/AnimationPreviewLayout";
import { riveHapticLabel } from "./hapticAction";
import { normalizeDexConfig } from "../project/starter/rive/normalizeDexConfig";
import type { Studio } from "../../app/useStudio";

interface IRiveInspector {
  studio: Studio;
}

export function RiveInspector(props: IRiveInspector) {
  const { studio } = props;
  const { session, document, animation } = studio;
  const {
    riv,
    info,
    stateMachine,
    setStateMachine,
    paused,
    restart,
    send,
    setPause,
    triggerRows,
    fire,
  } = session;
  const { project, begin, setProject } = document;
  const riveConfig = normalizeDexConfig(project.riveConfig, resolveRivePresetId(project));
  const replay = () => {
    restart();
    send({ type: "restart" });
    studio.activity.addLog("Restarted animation");
  };
  const togglePause = () => {
    setPause(!paused);
    send({ type: "pause", paused: !paused });
  };
  return (
    <section className="rive-inspector animation-panel" aria-label="Rive animation tools">
      <InspectorSection title="Animation">
        <dl className="animation-track-summary">
          <div>
            <dt>File</dt>
            <dd title={riv?.name}>{riv?.name}</dd>
          </div>
        </dl>
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
                          : Object.fromEntries(
                              Object.entries(pr.map).filter(([name]) => name !== t),
                            );
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
      </InspectorSection>
      <AnimationPreviewLayout animation={animation} />
    </section>
  );
}
