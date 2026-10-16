import type { ReactNode } from "react";
import { InspectorIcon } from "./InspectorIcon";

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
        {description && (
          <span className="inspector-info" role="img" aria-label={description} title={description}>
            <InspectorIcon name="info" />
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}
