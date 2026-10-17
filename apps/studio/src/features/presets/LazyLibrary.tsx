import { lazy, Suspense, type ComponentProps } from "react";
import type { Library } from "./Library";
const LoadedLibrary = lazy(() =>
  import("./Library").then((module) => ({ default: module.Library })),
);
export function LazyLibrary(props: ComponentProps<typeof Library>) {
  return (
    <Suspense fallback={<p className="hint">Loading presets…</p>}>
      <LoadedLibrary {...props} />
    </Suspense>
  );
}
