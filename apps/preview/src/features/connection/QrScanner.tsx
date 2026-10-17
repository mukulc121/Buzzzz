import { useRef, useState } from "react";
import { Linking, Modal, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { OutlineButton } from "../../components/OutlineButton";
import type { Theme } from "../../theme/colors";
import { font } from "../../theme/typography";
import { scannedConnection } from "./connectionInput";

interface IQrScanner {
  onClose: () => void;
  onConnect: (link: string) => void;
  t: Theme;
}
export function QrScanner(props: IQrScanner) {
  const { onClose, onConnect, t } = props;
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const claimed = useRef(false);
  const read = (data: string) => {
    if (claimed.current) return;
    claimed.current = true;
    setScanned(true);
    const value = scannedConnection(data);
    if (!value) {
      setError("This QR code is not a Studio connection. Scan the code in Studio’s Phone panel.");
      return;
    }
    onClose();
    onConnect(value);
  };
  return (
    <Modal onRequestClose={onClose} animationType="slide">
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 16, gap: 16 }}>
          <Text style={{ ...font.bold, fontSize: 26, color: t.fg }}>Scan a Studio QR code</Text>
          {permission?.granted ? (
            <View style={{ flex: 1, borderRadius: 4, overflow: "hidden" }}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanned ? undefined : ({ data }) => read(data)}
              />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
              <Text style={{ ...font.regular, color: t.fg, fontSize: 16 }}>
                Camera access is needed to scan a pairing code. You can also enter the connecting
                code on Home.
              </Text>
              <OutlineButton
                title={permission?.canAskAgain === false ? "Open Settings" : "Allow camera"}
                onPress={() => {
                  if (permission?.canAskAgain === false) void Linking.openSettings();
                  else void requestPermission();
                }}
                t={t}
              />
            </View>
          )}
          {error && (
            <Text accessibilityRole="alert" style={{ color: t.err, ...font.regular, fontSize: 16 }}>
              {error}
            </Text>
          )}
          {error && (
            <OutlineButton
              title="Scan again"
              onPress={() => {
                claimed.current = false;
                setError(null);
                setScanned(false);
              }}
              t={t}
            />
          )}
          <OutlineButton title="Cancel" onPress={onClose} t={t} />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
