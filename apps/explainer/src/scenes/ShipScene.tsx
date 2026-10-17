import { Appear, Card, Code, Pill, Scene } from "../components/Layout";
import { C, DARK } from "../theme/tokens";

export function ShipScene() {
  return (
    <Scene kicker="Files" title="Keep the whole project portable">
      <Appear delay={8}>
        <Card x={120} y={285} w={800} h={590}>
          <b style={{ fontSize: 33 }}>Import by file contents</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
            {[
              "Pulsar JSON",
              ".pulsar",
              "AHAP",
              "Lofelt",
              ".riv",
              "Audio",
              "Lottie / dotLottie",
            ].map((name) => (
              <Pill key={name}>{name}</Pill>
            ))}
          </div>
          <div style={{ fontSize: 25, color: C.fg2, lineHeight: 1.6, marginTop: 35 }}>
            Check referenced formats and media metadata.
            <br />
            Preserve original media and trim windows.
            <br />
            Convert AHAP and Lofelt with explicit limits.
          </div>
          <div style={{ fontSize: 25, color: C.accent, marginTop: 32 }}>
            Pattern JSON · Project JSON · Portable .pulsar
          </div>
        </Card>
      </Appear>
      <Appear delay={35}>
        <Card
          x={970}
          y={285}
          w={830}
          h={590}
          style={{ background: DARK.panel, borderColor: DARK.line }}
        >
          <div style={{ fontSize: 24, color: DARK.muted, marginBottom: 25 }}>
            project.pulsar · ZIP archive
          </div>
          <Code style={{ fontSize: 27, lineHeight: 1.65, color: DARK.fg }}>
            {
              "manifest.json     schema + SHA-256\nhaptics/          validated patterns\naudio/            original sound\nanimation/        original Lottie\nrive/             Rive asset\n\nBuzzzz metadata\n  trigger map · trim · markers\n  play range · editor duration"
            }
          </Code>
        </Card>
      </Appear>
      <Appear
        delay={85}
        style={{ position: "absolute", left: 120, top: 930, fontSize: 24, color: C.fg2 }}
      >
        Use an archive or a configured hosted share link to transfer data. A local project URL
        carries only its local ID.
      </Appear>
    </Scene>
  );
}
