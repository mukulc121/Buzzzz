interface IEditorPlayButton {
  playing: boolean;
  label: string;
  devices: number;
  onClick: () => void;
}

export function EditorPlayButton(props: IEditorPlayButton) {
  const { playing, label, devices, onClick } = props;
  return (
    <button
      type="button"
      className={`editor-play${playing ? " playing" : ""}`}
      data-tour="play"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {playing ? (
          <rect width="18" height="18" x="3" y="3" rx="2" />
        ) : (
          <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
        )}
      </svg>
      {devices > 0 && <span className="editor-device-dot" aria-hidden="true" />}
    </button>
  );
}
