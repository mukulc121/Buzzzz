import { C, MONO } from "../theme/tokens";
import { Appear, Card, Scene } from "../components/Layout";
import { Line } from "../components/Diagram";

interface INode {
  x: number;
  title: string;
  sub: string;
  items: string[];
  delay: number;
  color: string;
}
const Node = (props: INode) => {
  const { x, title, sub, items, delay, color } = props;
  return (
    <Appear delay={delay}>
      <Card x={x} y={300} w={480}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: color }} />
          <div style={{ fontSize: 36, fontWeight: 700 }}>{title}</div>
        </div>
        <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{sub}</div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => (
            <div key={it} style={{ fontSize: 24, color: C.fg2, display: "flex", gap: 12 }}>
              <span style={{ color }}>●</span>
              {it}
            </div>
          ))}
        </div>
      </Card>
    </Appear>
  );
};

export function PiecesScene() {
  return (
    <Scene kicker="Bun workspace" title="Three apps. One shared core.">
      <Line x1={360} y1={606} x2={360} y2={725} delay={45} />
      <Line x1={960} y1={606} x2={960} y2={725} delay={50} />
      <Node
        x={120}
        delay={6}
        color={C.accent}
        title="Studio"
        sub="apps/studio · React + Vite"
        items={[
          "Pattern editor + local relay",
          "Pulsar preset library",
          "Rive player + trigger mapping",
          "Export Pulsar JSON",
        ]}
      />
      <Node
        x={720}
        delay={18}
        color={C.freq}
        title="Preview"
        sub="apps/preview · Expo + React Native"
        items={[
          "Pulsar haptic playback",
          "Rive animation + triggers",
          "Shared relay messages",
          "Metro on port 8082",
        ]}
      />
      <Node
        x={1320}
        delay={30}
        color={C.ok}
        title="Explainer"
        sub="apps/explainer · Remotion"
        items={[
          "Animated walkthrough",
          "Generated voiceover",
          "Rendered with Chromium",
          "Video output as MP4",
        ]}
      />
      <Appear delay={60}>
        <Card x={120} y={725} w={1080} h={130} style={{ background: C.sunken }}>
          <div style={{ fontSize: 30, fontWeight: 700, fontFamily: MONO }}>packages/core</div>
          <div style={{ fontSize: 24, color: C.fg2, marginTop: 10 }}>
            Pattern validation · Project validation · Relay protocol
          </div>
        </Card>
      </Appear>
      <Appear delay={75} style={{ position: "absolute", left: 120, top: 925 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>
          One Bun workspace. Shared data contracts between the web editor and phone preview.
        </div>
      </Appear>
    </Scene>
  );
}
