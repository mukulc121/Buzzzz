import { useRef, type ReactNode } from "react";
interface IFilePicker {
  accept: string;
  onFile: (file: File) => Promise<void>;
  children: ReactNode;
  className?: string;
}
export function FilePicker(props: IFilePicker) {
  const { accept, onFile, children, className } = props;
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className={className} type="button" onClick={() => input.current?.click()}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void onFile(file);
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}
