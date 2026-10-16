import { SoundDialog } from "../audio/SoundDialog";

interface IDeviceAppGuide {
  onClose: () => void;
}
export function DeviceAppGuide(props: IDeviceAppGuide) {
  return (
    <SoundDialog title="Get Buzzzz Preview" onClose={props.onClose}>
      <div className="device-app-guide">
        <p>
          Use Buzzzz Preview to feel haptics and play Rive scenes from this editor on your iPhone or
          Android phone.
        </p>
        <p className="hint">
          The companion app needs a native development build. Expo Go does not include its haptics
          and Rive modules.
        </p>
        <a
          className="button"
          href="https://github.com/mukulc121/Buzzzz#preview-on-a-phone"
          target="_blank"
          rel="noreferrer"
        >
          Open the phone setup guide
        </a>
      </div>
    </SoundDialog>
  );
}
