import { ToolIcon } from "../../components/ToolIcon";

const PATHS = {
  audioLines: ["M2 10v3", "M6 6v11", "M10 3v18", "M14 8v7", "M18 5v13", "M22 10v3"],
  upload: ["M12 13v8", "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242", "m8 17 4-4 4 4"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  canvas: ["M16 5H3", "M11 12H3", "M16 19H3", "M18 9v6", "M21 12h-6"],
  rename: [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ],
  delete: [
    "M10 11v6",
    "M14 11v6",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  ],
  download: ["M12 15V3", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5"],
};
interface IMediaActionIcon {
  name: keyof typeof PATHS | "play" | "stop" | "pause";
  size?: number;
}
export function MediaActionIcon(props: IMediaActionIcon) {
  const { name, size = 16 } = props;
  if (name === "play" || name === "stop") return <ToolIcon name={name} size={size} />;
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
      {name === "pause" ? (
        <>
          <rect x="14" y="3" width="5" height="18" rx="1" />
          <rect x="5" y="3" width="5" height="18" rx="1" />
        </>
      ) : (
        PATHS[name].map((path) => <path key={path} d={path} />)
      )}
    </svg>
  );
}
