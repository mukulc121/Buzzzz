import type { ReactNode } from "react";

const paths = {
  inspector: (
    <>
      <path d="M3 5h10M3 11h10M6 3v4M10 9v4" />
    </>
  ),
  sound: (
    <>
      <path d="M2 7v2M5 4v8M8 2v12M11 4v8M14 6v4" />
    </>
  ),
  animation: (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M5 2v12M11 2v12M2 6h3M2 10h3M11 6h3M11 10h3" />
    </>
  ),
  collapse: (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M10 2v12M5 5l3 3-3 3" />
    </>
  ),
  undo: (
    <>
      <path d="M6 3 2 7l4 4M2 7h7a4 4 0 0 1 0 8" transform="translate(1 -1)" />
    </>
  ),
  redo: (
    <>
      <path d="m10 3 4 4-4 4M14 7H7a4 4 0 0 0 0 8" transform="translate(-1 -1)" />
    </>
  ),
  left: (
    <>
      <path d="m8 3-5 5 5 5M3 8h11" />
    </>
  ),
  right: (
    <>
      <path d="m8 3 5 5-5 5M13 8H2" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="m10 10 4 4M4 6.5h5" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="m10 10 4 4M4 6.5h5M6.5 4v5" />
    </>
  ),
  trash: (
    <>
      <path d="M2 4h12M6 4V2h4v2M4 4l1 10h6l1-10M7 6v6M9 6v6" />
    </>
  ),
  fit: (
    <>
      <path d="M6 2H2v4M10 14h4v-4M2 2l5 5M14 14l-5-5" />
    </>
  ),
  marker: (
    <>
      <path d="M12 6c0 3-4 8-4 8S4 9 4 6a4 4 0 0 1 8 0Z" />
      <circle cx="8" cy="6" r="1.5" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v4M8 4.5v.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

interface IInspectorIcon {
  name: keyof typeof paths;
}
export function InspectorIcon(props: IInspectorIcon) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[props.name]}
    </svg>
  );
}
