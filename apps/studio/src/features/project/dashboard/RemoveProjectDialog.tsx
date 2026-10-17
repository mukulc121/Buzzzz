import { Modal } from "./Modal";

interface IRemoveProjectDialog {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveProjectDialog(props: IRemoveProjectDialog) {
  const { name, onConfirm, onCancel } = props;
  return (
    <Modal
      title="Remove project"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="dashboard-button ghost" onClick={onCancel}>
            <span>Cancel</span>
          </button>
          <button type="button" className="dashboard-button danger" onClick={onConfirm}>
            <span>Remove</span>
          </button>
        </>
      }
    >
      Are you sure you want to remove <strong>{name}</strong>? This action can’t be undone.
    </Modal>
  );
}
