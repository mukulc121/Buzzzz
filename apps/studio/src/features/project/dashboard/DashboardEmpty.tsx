import type { ReactNode } from "react";
import { DashboardIcon } from "./DashboardIcon";

interface IDashboardEmpty {
  icon: "alert" | "folder";
  title: string;
  hint: string;
  children: ReactNode;
}

export function DashboardEmpty(props: IDashboardEmpty) {
  const { icon, title, hint, children } = props;
  return (
    <div className="project-dashboard-empty">
      <DashboardIcon name={icon} size={40} className="project-dashboard-empty-icon" />
      <p className="project-dashboard-empty-title">{title}</p>
      <p>{hint}</p>
      <div className="project-dashboard-empty-actions">{children}</div>
    </div>
  );
}
