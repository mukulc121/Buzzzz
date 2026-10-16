import type { ReactNode } from "react";

const icons = {
  play: <path d="m5 3 9 5-9 5V3Z" />,
  pause: (
    <>
      <path d="M5 3v10M11 3v10" />
    </>
  ),
  "side-by-side": (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M8 2v12" />
    </>
  ),
  stacked: (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M2 8h12" />
    </>
  ),
  floating: (
    <>
      <path d="M7 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" />
      <rect x="7" y="7" width="7" height="7" rx="1" />
    </>
  ),
  fullscreen: <path d="M6 2H2v4M10 2h4v4M14 10v4h-4M2 10v4h4" />,
  hide: (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M10 2v12M5 5l3 3-3 3" />
    </>
  ),
} satisfies Record<string, ReactNode>;
interface IAnimationPreviewIcon {
  name: keyof typeof icons;
}
export function AnimationPreviewIcon(props: IAnimationPreviewIcon) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[props.name]}
    </svg>
  );
}
