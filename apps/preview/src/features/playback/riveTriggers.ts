interface ITriggerProperty {
  trigger: () => void;
  addListener: (callback: () => void) => () => void;
  dispose: () => void;
}

interface ITriggerSignal {
  readonly aborted: boolean;
  addEventListener(type: "abort", callback: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", callback: () => void): void;
}

interface IRiveTriggers {
  source: {
    getPropertiesAsync: () => Promise<readonly { name: string; type: string }[]>;
    triggerProperty: (name: string) => ITriggerProperty | undefined;
  };
  canDispatch: () => boolean;
  onTrigger: (name: string) => void;
  signal: ITriggerSignal;
}

export async function bindRiveTriggers(options: IRiveTriggers) {
  const { source, signal, onTrigger, canDispatch } = options;
  const properties = new Map<string, ITriggerProperty>();
  const listeners: (() => void)[] = [];
  const dispose = () => {
    for (const unsubscribe of listeners.splice(0)) unsubscribe();
    for (const property of properties.values()) property.dispose();
    properties.clear();
  };
  const list = await source.getPropertiesAsync();
  if (signal.aborted) {
    const error = new Error("Rive trigger binding aborted");
    error.name = "AbortError";
    throw error;
  }
  signal.addEventListener("abort", dispose, { once: true });
  try {
    for (const { name, type } of list) {
      if (type !== "trigger") continue;
      const property = source.triggerProperty(name);
      if (!property) continue;
      properties.set(name, property);
      listeners.push(
        property.addListener(() => {
          if (!signal.aborted && canDispatch()) onTrigger(name);
        }),
      );
    }
  } catch (error) {
    signal.removeEventListener("abort", dispose);
    dispose();
    throw error;
  }
  return {
    names: [...properties.keys()],
    fire: (name: string) => {
      if (!signal.aborted && canDispatch()) properties.get(name)?.trigger();
    },
  };
}
