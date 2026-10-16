import { PreviewContext } from "./usePreview";
import { useEffect, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { dark, light } from "../../theme/colors";
import { EventToast } from "../../components/EventToast";
import { usePreviewSession } from "../preview/usePreviewSession";
import { useFullscreen } from "../preview/useFullscreen";

interface IPreviewProvider {
  children: ReactNode;
}
export function PreviewProvider(props: IPreviewProvider) {
  const { children } = props;
  const t = useColorScheme() === "dark" ? dark : light;
  const session = usePreviewSession();
  const { fullscreen, setFullscreen } = useFullscreen();
  const router = useRouter();
  const pathname = usePathname();
  const scene = session.riv;
  useEffect(() => {
    if (scene) {
      setFullscreen(false);
      router.replace("/preview");
    }
  }, [scene, router, setFullscreen]);
  useEffect(() => {
    if (pathname !== "/preview") setFullscreen(false);
  }, [pathname, setFullscreen]);
  const expanded = fullscreen && Boolean(scene);
  const value = useMemo(
    () => ({ t, session, fullscreen: expanded, setFullscreen }),
    [t, session, expanded, setFullscreen],
  );
  return (
    <PreviewContext value={value}>
      <StatusBar style={t === dark ? "light" : "dark"} hidden={expanded} />
      {children}
      <EventToast event={session.event} t={t} />
    </PreviewContext>
  );
}
