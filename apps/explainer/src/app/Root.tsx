import { Composition } from "remotion";
import { Explainer } from "../compositions/Explainer";
import { TOTAL } from "../compositions/timing";

export function Root() {
  return (
    <Composition
      id="Explainer"
      component={Explainer}
      durationInFrames={TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
