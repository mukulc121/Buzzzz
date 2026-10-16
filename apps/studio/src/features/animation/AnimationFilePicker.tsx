import { useRef } from "react";
import { Upload } from "../../components/icons";

interface IAnimationFilePicker {
  onFile: (file: File) => Promise<unknown>;
  disabled: boolean;
}
export function AnimationFilePicker(props: IAnimationFilePicker) {
  const { onFile, disabled } = props;
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="animation-file-picker">
      <button type="button" disabled={disabled} onClick={() => input.current?.click()}>
        <Upload />
        Add animation
      </button>
      <input
        ref={input}
        hidden
        type="file"
        aria-label="Lottie file"
        accept=".json,.lottie,application/json,application/zip+dotlottie"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void onFile(file);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
