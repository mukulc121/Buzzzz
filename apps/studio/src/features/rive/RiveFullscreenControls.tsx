import { Play, X } from "../../components/icons";

interface IRiveFullscreenControls {
  paused: boolean;
  onReplay: () => void;
  onPause: () => void;
  onExit: () => void;
}

export function RiveFullscreenControls(props: IRiveFullscreenControls) {
  return (
    <div className="rive-fullscreen-controls" role="group" aria-label="Fullscreen Rive playback">
      <button aria-label="Replay Rive animation" onClick={props.onReplay}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11a9 9 0 1 1 2.4 6.1M3 4v7h7" />
        </svg>
        Replay
      </button>
      <button
        aria-label={props.paused ? "Play Rive animation" : "Pause Rive animation"}
        onClick={props.onPause}
      >
        {props.paused ? (
          <Play />
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 3h3v10H4zM9 3h3v10H9z" />
          </svg>
        )}
        {props.paused ? "Play" : "Pause"}
      </button>
      <button aria-label="Exit fullscreen Rive preview" onClick={props.onExit}>
        <X /> Exit fullscreen
      </button>
    </div>
  );
}
