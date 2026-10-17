import { useEffect, useRef, useState } from "react";
import { PanelCollapseIcon } from "../../components/PanelCollapseIcon";
import type { IRoom } from "./cloud";
import { PairingDialog } from "./PairingDialog";
import { DeviceAppGuide } from "./DeviceAppGuide";

interface IDevice {
  phones: number;
  room?: IRoom | null;
  onHide: () => void;
}
function PhoneIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
export function Device(props: IDevice) {
  const { phones, room = null, onHide } = props;
  const [pairingOpen, setPairingOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const previousPhones = useRef(phones);
  useEffect(() => {
    if (phones > previousPhones.current) setPairingOpen(false);
    previousPhones.current = phones;
  }, [phones]);
  return (
    <section className="device-panel" aria-label="Device connection">
      <header className="panel-heading device-heading">
        <h2>Device</h2>
        <span className="device-status" data-online={phones > 0}>
          {phones ? `${phones} online` : "Offline"}
        </span>
        <button
          type="button"
          className="icon"
          aria-label="Hide panel"
          title="Hide panel"
          onClick={onHide}
        >
          <PanelCollapseIcon />
        </button>
      </header>
      {phones ? (
        <div className="device-connected">
          <div className="device-connected-card">
            <span className="device-live-dot" />
            <div>
              <h3>{phones} connected</h3>
              <p className="hint">Ready to preview haptics from this editor.</p>
            </div>
          </div>
          <button type="button" onClick={() => setPairingOpen(true)}>
            Pair another phone
          </button>
        </div>
      ) : (
        <div className="device-empty">
          <span className="device-empty-icon">
            <PhoneIcon />
          </span>
          <h3>No device connected</h3>
          <p>
            Pair a phone to feel your haptics on real hardware. Open Buzzzz Preview and scan the
            pairing code. You can pair several.
          </p>
          <button type="button" className="device-connect" onClick={() => setPairingOpen(true)}>
            Connect device
          </button>
          <button type="button" className="device-app-link" onClick={() => setGuideOpen(true)}>
            <PhoneIcon />
            <span>Don't have Buzzzz Preview?</span>
          </button>
        </div>
      )}
      {pairingOpen && (
        <PairingDialog room={room} phones={phones} onClose={() => setPairingOpen(false)} />
      )}
      {guideOpen && <DeviceAppGuide onClose={() => setGuideOpen(false)} />}
    </section>
  );
}
