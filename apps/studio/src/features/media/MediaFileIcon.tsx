import type { MediaKind } from "./model";

interface IMediaFileIcon {
  kind: MediaKind;
}

const PATHS: Record<MediaKind, string> = {
  audio:
    "M9 18V5l10-2v13M9 8l10-2M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Zm10-2a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z",
  animation: "M4 3h16v18H4zM8 3v18M16 3v18M4 8h16M4 16h16",
  rive: "M4 19 10 4l10 15H4Zm6-15 3 15m-7-5h11",
};

export function MediaFileIcon(props: IMediaFileIcon) {
  const { kind } = props;
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[kind]} />
    </svg>
  );
}
