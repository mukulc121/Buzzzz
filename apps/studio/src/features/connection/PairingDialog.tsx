import { useState } from "react";
import { Copy } from "../../components/icons";
import { SoundDialog } from "../audio/SoundDialog";
import type { IRoom } from "./cloud";
import { usePairing } from "./usePairing";

interface IPairingDialog {
  room: IRoom | null;
  phones: number;
  onClose: () => void;
}
export function PairingDialog(props: IPairingDialog) {
  const { room, phones, onClose } = props;
  const { url, qr, error, code, loading, renew } = usePairing(room, phones);
  const [copyStatus, setCopyStatus] = useState("");
  return (
    <SoundDialog title="Connect device" onClose={onClose}>
      <div className="device-pairing" aria-busy={loading}>
        <p className="hint">
          Open Buzzzz Preview on your phone and scan this QR code
          {room
            ? " or enter the pairing code."
            : ". Keep the phone and computer on the same Wi-Fi."}
        </p>
        {error ? (
          <p className="notice" role="alert">
            {error}
          </p>
        ) : (
          <>
            {qr ? (
              <img
                className="qr"
                src={qr}
                alt="QR code that pairs Buzzzz Preview with this editor"
              />
            ) : (
              <div className="qr skeleton" aria-label="Preparing pairing QR code" />
            )}
            {room && (
              <div className="pair-code" aria-label="Pairing code">
                {code ?? "…"}
              </div>
            )}
            {room && (
              <button type="button" disabled={loading} onClick={renew}>
                Refresh pairing code
              </button>
            )}
            <div className="relay-address">
              <div className="relay-address-head">
                <label htmlFor="relay-url">Or paste this address in the app</label>
                <button
                  type="button"
                  className="icon"
                  aria-label="Copy relay address"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(url)
                      .then(() => setCopyStatus("Address copied"))
                      .catch(() => setCopyStatus("Select the address to copy it manually"))
                  }
                >
                  <Copy />
                </button>
              </div>
              <input
                id="relay-url"
                className="relay-url"
                aria-label="Relay address"
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            {room && url && (
              <a className="button" href={url}>
                Open Buzzzz Preview
              </a>
            )}
          </>
        )}
        {error && (
          <button type="button" onClick={renew}>
            Try again
          </button>
        )}
        <p className="hint" role="status">
          {copyStatus}
        </p>
      </div>
    </SoundDialog>
  );
}
