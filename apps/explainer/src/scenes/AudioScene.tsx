import { Appear, Card, Pill, Scene } from "../components/Layout";
import { WorkspaceChart } from "../components/WorkspaceChart";
import { C } from "../theme/tokens";

const APPROACHES = [
  "Multiband split",
  "Transient taps",
  "Percussive / harmonic split",
  "Impact follower",
  "RMS envelope",
  "Filter-chain transcode",
  "Perceptual loudness",
  "Beat grid",
  "Melodic transcode",
];
export function AudioScene() {
  return (
    <Scene kicker="Sound" title="Turn real audio into editable haptics">
      <Appear delay={8}>
        <Card x={120} y={270} w={960} h={610}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <b style={{ fontSize: 28 }}>♫ bounce.wav</b>
            <Pill>20 ms frames</Pill>
          </div>
          <div style={{ fontSize: 18, color: C.muted, marginBottom: 20 }}>
            Track · Signal analysis · Generate · Approaches
          </div>
          <WorkspaceChart theme={C} compact={false} />
          <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
            <Pill>Trim 0.25–4.00 s</Pill>
            <Pill color={C.freq}>Fit to clip / True value · dB</Pill>
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
                    padding: "16px 10px",
                    fontSize: 18,
                    minHeight: 70,
                    boxSizing: "border-box",
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                  }}
                >
                  {name}
                </div>
              </Appear>
            ))}
          </div>
          <div style={{ fontSize: 20, color: C.fg2, lineHeight: 1.6, marginTop: 22 }}>
            Vibrotactile loudness · Envelope · Band energy
            <br />
            Roughness · Fluctuation strength · Sharpness
            <br />
            Centroid · Transient sharpness · Onset novelty
            <br />
            Tempo / beat · Percussive share · Tonality
          </div>
          <div style={{ marginTop: 20 }}>
            <Pill>Choose approach</Pill> <Pill color={C.ok}>Restore my pattern</Pill>
          </div>
        </Card>
      </Appear>
      <Appear
        delay={85}
        style={{ position: "absolute", left: 120, top: 930, fontSize: 24, color: C.fg2 }}
      >
        12 signal metrics · Nine generators · 2–100 ms frames · Perceptual values remain estimates
      </Appear>
    </Scene>
  );
}
