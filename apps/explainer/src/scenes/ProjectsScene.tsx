import { Appear, Card, Code, Pill, Scene } from "../components/Layout";
import { C } from "../theme/tokens";

export function ProjectsScene() {
  return (
    <Scene kicker="Projects" title="Your work stays in this browser">
      <Appear delay={8}>
        <Card x={120} y={270} w={1010} h={590}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 34 }}>Projects</b>
            <Pill>Create new project</Pill>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 30, fontSize: 22, color: C.muted }}>
            <span>⌕ Search by name</span>
            <span style={{ marginLeft: "auto" }}>Last updated ▾</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 30 }}>
            {[
              ["Bouncing ball", "3 patterns · Audio + Lottie"],
              ["Notifications", "5 patterns · Rive"],
            ].map(([name, detail]) => (
              <div
                key={name}
                style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 24 }}
              >
                <div
                  style={{
                    height: 60,
                    background: C.sunken,
                    color: C.accent,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 42,
                  }}
                >
                  ⌁
                </div>
                <b style={{ display: "block", marginTop: 20, fontSize: 27 }}>{name}</b>
                <div style={{ color: C.fg2, fontSize: 21, marginTop: 12 }}>{detail}</div>
                <div style={{ color: C.muted, fontSize: 20, marginTop: 16 }}>
                  Open · Rename · Remove
                </div>
              </div>
            ))}
          </div>
          <Code style={{ marginTop: 24, fontSize: 24, color: C.accent }}>
            /studio/projects/&lt;local-id&gt;
          </Code>
        </Card>
      </Appear>
      <Appear delay={35}>
        <Card x={1180} y={270} w={620} h={265}>
          <b style={{ fontSize: 31 }}>localStorage</b>
          <div style={{ fontSize: 25, color: C.fg2, lineHeight: 1.55, marginTop: 24 }}>
            Project records, patterns, mappings, markers, and editor state
          </div>
        </Card>
      </Appear>
      <Appear delay={55}>
        <Card x={1180} y={575} w={620} h={285}>
          <b style={{ fontSize: 31 }}>IndexedDB</b>
          <div style={{ fontSize: 25, color: C.fg2, lineHeight: 1.55, marginTop: 24 }}>
            Original media, attachments, and trim windows
          </div>
          <div style={{ fontSize: 21, color: C.muted, marginTop: 24 }}>
            Clearing site data removes local work.
          </div>
        </Card>
      </Appear>
      <Appear
        delay={90}
        style={{ position: "absolute", left: 120, top: 930, color: C.fg2, fontSize: 25 }}
      >
        Local IDs do not sync between browsers. Transfer a project with a .pulsar file or a
        configured share link.
      </Appear>
    </Scene>
  );
}
