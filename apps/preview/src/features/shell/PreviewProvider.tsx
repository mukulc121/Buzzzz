import { PreviewContext } from "./usePreview";
import { useEffect, useEffectEvent, useMemo, useRef, type ReactNode } from "react";
import { useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { light } from "../../theme/colors";
import { EventToast } from "../../components/EventToast";
import { usePreviewSession } from "../preview/usePreviewSession";
import { useNativeSound } from "../playback/useNativeSound";
import { useFilters } from "../presets/useFilters";
import { useFullscreen } from "../preview/useFullscreen";
import { MiniPlayer } from "../sessionLibrary/MiniPlayer";
import { mediaStatusText } from "../sessionLibrary/mediaStatus";
import { showPreview } from "./showPreview";

interface IPreviewProvider {
  children: ReactNode;
}
export function PreviewProvider(props: IPreviewProvider) {
  const { children } = props;
  const t = light;
  const session = usePreviewSession();
  const { fullscreen, setFullscreen } = useFullscreen();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { soundEnabled } = useFilters();
  const scene = session.riv;
  useNativeSound({
    preference: soundEnabled,
    pathname,
    playing: !session.paused,
    riveConfig: scene?.riveConfig,
  });
  const { connectionId: openConnectionId } = useGlobalSearchParams<{ connectionId?: string }>();
  const insets = useSafeAreaInsets();
  const { library } = session;
  const received = library.active;
  const handledLibrary = useRef<typeof session.incomingLibrary>(null);
  const incoming = session.incomingLibrary;
  useEffect(() => {
    if (!incoming || handledLibrary.current === incoming) return;
    handledLibrary.current = incoming;
    if (pathname === "/mediaLibraryModal" && openConnectionId === incoming.connectionId) return;
    const route = {
      pathname: "/mediaLibraryModal" as const,
      params: { connectionId: incoming.connectionId },
    };
    if (pathname === "/mediaLibraryModal") router.replace(route);
    else router.push(route);
  }, [incoming, pathname, openConnectionId, router]);
  const openScene = useEffectEvent(() => {
    setFullscreen(false);
    showPreview(router, segments);
  });
  useEffect(() => {
    if (scene) openScene();
  }, [scene]);
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
      <StatusBar style="dark" hidden={expanded} />
      {children}
      <MiniPlayer
        record={received?.record ?? null}
        visible={!expanded && pathname !== "/mediaLibraryModal" && pathname !== "/presets"}
        playing={library.playing}
        disabled={library.downloading || (!library.hydrated && !received)}
        downloading={library.downloading}
        error={!!library.error}
        statusText={mediaStatusText(
          received?.record ?? null,
          library.positionMs,
          library.downloading,
          library.downloadProgress,
          library.error,
        )}
        progress={
          library.downloading
            ? library.downloadProgress
            : received && received.record.durationMs > 0
              ? library.positionMs / received.record.durationMs
              : 0
        }
        bottomInset={insets.bottom}
        onOpen={() => {
          if (received)
            router.push({
              pathname: "/mediaLibraryModal",
              params: { connectionId: received.connectionId },
            });
        }}
        onTogglePlay={library.togglePlay}
        onDismiss={library.dismiss}
      />
      <EventToast event={session.event} t={t} />
    </PreviewContext>
  );
}
