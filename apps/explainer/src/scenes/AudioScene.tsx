import { Appear, Card, Pill, Scene } from "../components/Layout";
import { WorkspaceChart } from "../components/WorkspaceChart";
import { C } from "../theme/tokens";

const APPROACHES = [
  "RMS",
  "Perceptual",
  "Impact",
  "Transients",
  "Beats",
  "Percussive",
  "Multiband",
  "Melodic",
  "Filter chain",
];
export function AudioScene() {
  return (
    <Scene kicker="Sound" title="Turn real audio into editable haptics">
      <Appear delay={8}>
        <Card x={120} y={270} w={960} h={610}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <b style={{ fontSize: 28 }}>♫ bounce.wav</b>
            <Pill>20 ms frames</Pill>
          </div>
          <WorkspaceChart theme={C} compact={false} />
          <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
            <Pill>Trim 0.25–4.00 s</Pill>
            <Pill color={C.freq}>Fit / True · dB</Pill>
          </div>
        </Card>
      </Appear>
      <Appear delay={28}>
        <Card x={1130} y={270} w={670} h={610}>
          <b style={{ fontSize: 30 }}>Nine generation approaches</b>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginTop: 26,
            }}
          >
            {APPROACHES.map((name, i) => (
              <Appear key={name} delay={35 + i * 5}>
                <div
                  style={{
                    border: `1px solid ${i === 2 ? C.accent : C.line}`,
                    background: i === 2 ? C.sunken : C.panel,
                    borderRadius: 9,
                    padding: "22px 10px",
                    fontSize: 21,
                    textAlign: "center",
                  }}
                >
                  {name}
                </div>
              </Appear>
            ))}
          </div>
          <div style={{ fontSize: 22, color: C.fg2, lineHeight: 1.6, marginTop: 30 }}>
            Loudness · Envelope · Band energy · Onsets
            <br />
            Roughness · Sharpness · Centroid · Tempo
            <br />
            Percussive share · Tonality · Pitch
          </div>
          <div style={{ marginTop: 26 }}>
            <Pill>Apply candidate</Pill> <Pill color={C.ok}>Restore original</Pill>
          </div>
        </Card>
      </Appear>
      <Appear
        delay={85}
        style={{ position: "absolute", left: 120, top: 930, fontSize: 24, color: C.fg2 }}
      >
        Web Audio decoding · Worker analysis · Psychoacoustic values are estimates · Up to 60
        seconds
      </Appear>
    </Scene>
  );
}
