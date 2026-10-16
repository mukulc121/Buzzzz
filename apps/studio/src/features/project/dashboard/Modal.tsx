import { useEffect, useId, useRef, type ReactNode } from "react";
import { DashboardIcon } from "./DashboardIcon";

interface IModal {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}

export function Modal(props: IModal) {
  const { title, children, footer, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dashboard-modal"
      aria-labelledby={heading}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="dashboard-modal-header">
        <h2 id={heading}>{title}</h2>
        <button
          type="button"
          className="dashboard-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <DashboardIcon name="x" size={20} />
        </button>
      </div>
      <div className="dashboard-modal-content">{children}</div>
      <div className="dashboard-modal-footer">{footer}</div>
    </dialog>
  );
}
