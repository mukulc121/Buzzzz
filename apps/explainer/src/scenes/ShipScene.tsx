import { C, FONT } from "../theme/tokens";
import { Appear, Card, Code, Scene } from "../components/Layout";
import { Line } from "../components/Diagram";

export function ShipScene() {
  return (
    <Scene kicker="4 · Ship" title="Export the pattern. Keep your project.">
      <Appear delay={6}>
        <Card x={120} y={300} w={640} h={500}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Export from the Studio</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 30 }}>
            <div style={{ fontSize: 24, color: C.fg2 }}>
              <b>Pattern</b> · Pulsar JSON for your app
            </div>
            <div style={{ fontSize: 24, color: C.fg2 }}>
              <b>Project</b> · Patterns, trigger mappings and the Rive asset in one JSON file
            </div>
          </div>
        </Card>
      </Appear>
      <Line x1={760} y1={550} x2={860} y2={550} delay={30} />
      <Appear delay={36}>
        <Card
          x={860}
          y={300}
          w={940}
          h={500}
          style={{ background: "rgba(10, 27, 46, 1)", borderColor: "rgba(10, 27, 46, 1)" }}
        >
          <div
            style={{
              fontSize: 20,
              color: "rgba(130, 177, 201, 1)",
              fontFamily: FONT,
              marginBottom: 18,
            }}
          >
            Your React Native app
          </div>
          <Code style={{ color: "rgba(227, 246, 255, 1)", fontSize: 21 }}>
            {`import thud from './haptics/thud.json'

const haptic = usePatternComposer()

function onImpact() {
  haptic.stop()
  haptic.parse(thud)
  haptic.play()
}`}
          </Code>
        </Card>
      </Appear>
      <Appear delay={80} style={{ position: "absolute", left: 120, top: 860 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>
          Connect your app's Rive trigger to Pulsar playback, then test the haptics on a physical
          phone.
        </div>
      </Appear>
    </Scene>
  );
}
