import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IRiveConfig, Pattern, TRiveCue, TSystemImpact } from "@buzzzz/core";
import { riveCuePattern } from "@buzzzz/core/presets";
import { playBuffer, prepareSound, renderSound, stopSound } from "../composer/audio";

function profilePatterns(config: IRiveConfig | undefined) {
  const patterns = new Map<string, Pattern>();
  for (const action of Object.values(config?.haptics ?? {})) {
    if (action.kind !== "sequence") continue;
    const cues = action.immediate
      ? [{ delayMs: 0, preset: action.immediate }, ...action.cues]
      : action.cues;
    for (const cue of cues) {
      const pattern = riveCuePattern(cue);
      if (pattern) patterns.set(JSON.stringify(pattern), pattern);
    }
  }
  return { key: JSON.stringify([...patterns.keys()].sort()), patterns };
}

interface IPreparedSound {
  render: Promise<AudioBuffer>;
  buffer?: AudioBuffer;
}

export function useRiveSound(config: IRiveConfig | undefined) {
  const enabled = useRef(false);
  const generation = useRef(0);
  const owner = useRef({ current: () => generation.current++ });
  const profile = useMemo(() => profilePatterns(config), [config]);
  const sounds = useRef({ key: "", entries: new Map<string, IPreparedSound>() });
  const [prepared, setPrepared] = useState<string | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    stopSound(owner.current);
  }, []);
  useEffect(() => {
    let active = true;
    if (sounds.current.key !== profile.key) {
      setPrepared(null);
      stop();
      const entries = new Map<string, IPreparedSound>();
      sounds.current = { key: profile.key, entries };
      for (const [key, pattern] of profile.patterns) {
        const entry: IPreparedSound = {
          render: Promise.resolve().then(() => renderSound(pattern)),
        };
        entry.render = entry.render.then((buffer) => {
          entry.buffer = buffer;
          return buffer;
        });
        entries.set(key, entry);
      }
    }
    void Promise.allSettled([...sounds.current.entries.values()].map((entry) => entry.render)).then(
      () => {
        if (active) setPrepared(profile.key);
      },
    );
    return () => {
      active = false;
    };
  }, [profile, stop]);
  const impact = useCallback((cue: TSystemImpact | TRiveCue) => {
    if (!enabled.current) return;
    const pattern = riveCuePattern(typeof cue === "string" ? { delayMs: 0, preset: cue } : cue);
    if (!pattern) return;
    const token = ++generation.current;
    void prepareSound(pattern, sounds.current.entries.get(JSON.stringify(pattern))?.buffer)
      .then((buffer) => {
        if (token === generation.current && enabled.current) playBuffer(buffer, 0, owner.current);
      })
      .catch(() => {});
  }, []);
  const setEnabled = useCallback(
    (value: boolean) => {
      enabled.current = value;
      if (!value) stop();
    },
    [stop],
  );
  const isEnabled = useCallback(() => enabled.current, []);
  useEffect(() => stop, [stop]);
  return {
    impact,
    stop,
    setEnabled,
    isEnabled,
    ready: profile.patterns.size === 0 || prepared === profile.key,
  };
}
