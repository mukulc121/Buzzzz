import { Appear, Card, Code, Pill, Scene } from "../components/Layout";
import { C } from "../theme/tokens";

export function PairingScene() {
  return (
    <Scene kicker="Connect" title="Pair locally, or configure a hosted relay">
      <Appear delay={8}>
        <Card x={120} y={290} w={790} h={555}>
          <Pill>Trusted local network</Pill>
          <b style={{ display: "block", fontSize: 34, marginTop: 26 }}>
            Studio + Preview development build
          </b>
          <Code style={{ fontSize: 24, marginTop: 32, color: C.accent }}>
            {"ws://192.168.0.12:5173/relay"}
          </Code>
          <div style={{ fontSize: 26, color: C.fg2, lineHeight: 1.65, marginTop: 30 }}>
            Same Wi-Fi · Scan the pairing QR
            <br />
            Allow Local Network access on iOS
            <br />
            Local relay shares one development session
          </div>
        </Card>
      </Appear>
      <Appear delay={32}>
        <Card x={960} y={290} w={840} h={555}>
          <Pill color={C.freq}>Cloudflare deployment option</Pill>
          <b style={{ display: "block", fontSize: 34, marginTop: 26 }}>
            Worker · Private rooms · Private R2
          </b>
          <div style={{ display: "flex", gap: 14, marginTop: 32 }}>
            <Pill>WSS</Pill>
            <Pill>Room tokens</Pill>
            <Pill>Single-use code</Pill>
          </div>
          <div style={{ fontSize: 26, color: C.fg2, lineHeight: 1.65, marginTop: 30 }}>
            Ten-minute pairing code · 24-hour room
            <br />
            Signed asset and explicit project links
            <br />
            MCP project editing + open-editor tools
          </div>
        </Card>
      </Appear>
      <Appear
        delay={80}
        style={{ position: "absolute", left: 120, top: 910, fontSize: 25, color: C.fg2 }}
      >
        Configure the Worker, bucket, and allowed Studio origins. Rooms do not sync the local
        project catalog.
      </Appear>
    </Scene>
  );
}
