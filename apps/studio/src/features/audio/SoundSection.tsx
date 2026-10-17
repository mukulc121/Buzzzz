import type { ReactNode } from "react";
import { InspectorIcon } from "../../components/InspectorIcon";

interface ISoundSection {
  title: string;
  description?: string;
  children: ReactNode;
}
interface ISoundInfo {
  description: string;
}

export function SoundInfo(props: ISoundInfo) {
  const { description } = props;
  return (
    <span className="sound-info" role="img" aria-label={description} title={description}>
      <InspectorIcon name="info" />
    </span>
  );
}

export function SoundSection(props: ISoundSection) {
  const { title, description, children } = props;
  return (
    <section className="sound-section">
      <h3>
        {title}
        {description && <SoundInfo description={description} />}
      </h3>
      <div className="sound-section-controls">{children}</div>
    </section>
  );
}
