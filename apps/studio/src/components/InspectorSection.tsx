import type { ReactNode } from "react";
import { HelpPopover } from "./HelpPopover";

interface IInspectorSection {
  title: string;
  description?: string;
  children: ReactNode;
}
export function InspectorSection(props: IInspectorSection) {
  const { title, description, children } = props;
  return (
    <section
      className="inspector-section"
      data-tour={`inspector-${title.toLowerCase().replaceAll(" ", "-")}`}
    >
      <h3>
        {title}
        {description && <HelpPopover text={description} label={title} />}
      </h3>
      {children}
    </section>
  );
}
