import { Appear, Scene } from "../components/Layout";
import { StudioIllustration } from "../components/StudioIllustration";
import { C, DARK } from "../theme/tokens";

export function WorkspaceScene() {
  return (
    <Scene kicker="The workspace" title="A responsive Studio in light and dark">
      <Appear
        delay={8}
        style={{ position: "absolute", left: 120, top: 250, width: 1240, height: 680 }}
      >
        <StudioIllustration theme={C} />
      </Appear>
      <Appear
        delay={30}
        style={{ position: "absolute", left: 1430, top: 250, width: 370, height: 680 }}
      >
        <StudioIllustration theme={DARK} compact />
      </Appear>
      <Appear
        delay={55}
        style={{ position: "absolute", left: 120, top: 948, color: C.fg2, fontSize: 24 }}
      >
        Responsive layout · Light, system and dark themes · Keyboard controls · Numeric point
        editing
      </Appear>
    </Scene>
  );
}
