import { useEffect, useRef, type ReactNode } from "react";
import { X } from "../../components/icons";

interface ISoundDialog {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function SoundDialog(props: ISoundDialog) {
  const { title, onClose, children } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="sound-dialog" aria-label={title} onCancel={onClose}>
      <header>
        <h2>{title}</h2>
        <button className="icon" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
          <X />
        </button>
      </header>
      <div className="sound-dialog-body">{children}</div>
    </dialog>
  );
}
