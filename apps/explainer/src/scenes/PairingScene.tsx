import { C, MONO } from "../theme/tokens";
import { Appear, Card, Code, Pill, Scene } from "../components/Layout";
import { Line } from "../components/Diagram";

interface IQrIllustration {
  size: number;
}
function QrIllustration(props: IQrIllustration) {
  const { size } = props;
  const n = 21;
  const cell = size / n;
  const on = (x: number, y: number) => {
    const finder = (fx: number, fy: number) =>
      x >= fx &&
      x < fx + 7 &&
      y >= fy &&
      y < fy + 7 &&
      (x === fx ||
        x === fx + 6 ||
        y === fy ||
        y === fy + 6 ||
        (x > fx + 1 && x < fx + 5 && y > fy + 1 && y < fy + 5));
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true;
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false;
    return (x * 7 + y * 13 + x * y) % 5 < 2;
  };
  return (
    <svg
      width={size}
      height={size}
      style={{ background: "rgba(255, 255, 255, 1)", borderRadius: 12 }}
    >
      {Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)])
        .filter(([x, y]) => on(x, y))
        .map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x * cell}
            y={y * cell}
            width={cell + 0.5}
            height={cell + 0.5}
            fill="rgba(0, 26, 114, 1)"
          />
        ))}
    </svg>
  );
}

export function PairingScene() {
  return (
    <Scene kicker="Pairing" title="Pair over your local network">
      <Appear delay={6}>
        <Card
          x={120}
          y={300}
          w={420}
          h={480}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
        >
          <QrIllustration size={300} />
          <div style={{ fontSize: 24, color: C.fg2, textAlign: "center" }}>
            Phone card · example QR
          </div>
        </Card>
      </Appear>
      <Line x1={540} y1={540} x2={640} y2={540} delay={30} />
      <Appear delay={36}>
        <Card x={640} y={410} w={640} style={{ padding: 24 }}>
          <div style={{ fontSize: 22, color: C.muted }}>iPhone Camera opens the deep link</div>
          <Code style={{ marginTop: 10, fontSize: 21, color: C.accent }}>
            {"rivehaptics://connect?url=\n  ws://192.168.0.12:5173/relay"}
          </Code>
        </Card>
      </Appear>
      <Line x1={1280} y1={540} x2={1380} y2={540} delay={60} />
      <Appear delay={66}>
        <Card x={1380} y={300} w={420} h={480}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Preview app</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: 24,
              fontSize: 23,
              color: C.fg2,
            }}
          >
            <div>
              <Pill color={C.ok}>● Live</Pill>
            </div>
            <div>
              Says <span style={{ fontFamily: MONO }}>hello</span> → Studio sends the .riv + trigger
              map
            </div>
            <div>
              Downloads <span style={{ fontFamily: MONO }}>/riv/&lt;hash&gt;.riv</span> over HTTP
            </div>
            <div>Reconnects by itself if Wi-Fi blips</div>
          </div>
        </Card>
      </Appear>
      <Appear delay={100} style={{ position: "absolute", left: 120, top: 860 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>
          Install the preview development build first. Use the same Wi-Fi and allow local-network
          access.
        </div>
      </Appear>
    </Scene>
  );
}
