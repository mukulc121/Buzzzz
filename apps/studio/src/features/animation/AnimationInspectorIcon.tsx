import type { ReactNode } from "react";

const frame = <rect width="18" height="18" x="3" y="3" rx="2" />;
const icons = {
  media: (
    <>
      {frame}
      <path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4" />
    </>
  ),
  hide: (
    <>
      {frame}
      <path d="M15 3v18M8 9l3 3-3 3" />
    </>
  ),
  show: (
    <>
      {frame}
      <path d="M15 3v18M10 15l-3-3 3-3" />
    </>
  ),
  "side-by-side": (
    <>
      {frame}
      <path d="M12 3v18" />
    </>
  ),
  stacked: (
    <>
      {frame}
      <path d="M3 12h18" />
    </>
  ),
  floating: (
    <>
      <path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4" />
      <rect width="10" height="7" x="12" y="13" rx="2" />
    </>
  ),
  reset: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />,
  loading: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

interface IAnimationInspectorIcon {
  name: keyof typeof icons;
  size?: number;
}

export function AnimationInspectorIcon(props: IAnimationInspectorIcon) {
  const { name, size = 16 } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}
