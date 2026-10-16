import { useEffect, useRef, useState, type RefObject } from 'react'
import { Rive } from '@rive-app/canvas'

export type RiveInfo = { triggers: string[]; stateMachines: string[] }

/**
 * Plays a .riv on a canvas and reports the trigger properties of its default view model.
 * Haptics hang off view-model triggers (data binding) — Rive Events are deprecated in
 * both the web and React Native runtimes.
 */
export function useRive(
  canvas: RefObject<HTMLCanvasElement | null>,
  buffer: ArrayBuffer | null,
  stateMachine: string | undefined,
  onFired: (name: string) => void,
) {
  const [info, setInfo] = useState<RiveInfo>({ triggers: [], stateMachines: [] })
  const rive = useRef<Rive | null>(null)
  const fired = useRef(onFired)
  fired.current = onFired
  // Bumping the run id rebuilds the instance: animation from frame 0, fresh view model, listeners re-attached.
  const [run, setRun] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!buffer || !canvas.current) return
    const r = new Rive({
      buffer: buffer.slice(0),
      canvas: canvas.current,
      stateMachines: stateMachine,
      autoplay: true,
      autoBind: true,
      onLoad: () => {
        r.resizeDrawingSurfaceToCanvas()
        const vmi = r.viewModelInstance
        // ponytail: top-level triggers of the default view model only; nested view models later if needed
        const triggers = (vmi?.properties ?? []).filter((p) => String(p.type) === 'trigger').map((p) => p.name)
        triggers.forEach((n) => vmi!.trigger(n)?.on(() => fired.current(n)))
        setInfo({ triggers, stateMachines: r.stateMachineNames })
      },
    })
    rive.current = r
    setPaused(false)
    return () => r.cleanup()
  }, [buffer, stateMachine, canvas, run])

  const fire = (name: string) => rive.current?.viewModelInstance?.trigger(name)?.trigger()
  const restart = () => setRun((n) => n + 1)
  const setPause = (p: boolean) => {
    if (p) rive.current?.pause()
    else rive.current?.play()
    setPaused(p)
  }
  return { info, fire, restart, paused, setPause }
}
