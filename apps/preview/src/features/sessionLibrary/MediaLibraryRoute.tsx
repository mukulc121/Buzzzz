import { useLocalSearchParams, useRouter } from "expo-router";
import { usePreview } from "../shell/usePreview";
import { MediaLibraryScreen } from "./MediaLibraryScreen";
import { formatLibraryTime } from "./canvasGeometry";
import { listCachedPatterns } from "./patterns";
import { useLibraryRefresh } from "./useLibraryRefresh";

export function MediaLibraryRoute() {
  const params = useLocalSearchParams<{ connectionId?: string | string[] }>();
  const connectionId = typeof params.connectionId === "string" ? params.connectionId : "";
  const router = useRouter();
  const { session } = usePreview();
  const { relay, library, manifestRevision } = session;
  const connection = relay.connections.find((record) => record.id === connectionId);
  const active = library.active?.connectionId === connectionId ? library.active.record : null;
  const sync = useLibraryRefresh({
    connectionId,
    connected: connection?.status === "connected",
    revision: manifestRevision[connectionId] ?? 0,
    request: () => relay.send({ type: "library-manifest-request" }, connectionId),
  });
  const report = (action: Promise<void>) => {
    void action.catch(() => {});
  };
  return (
    <MediaLibraryScreen
      connectionName={connection?.label ?? "Connection"}
      available={!!connection}
      records={listCachedPatterns(library.library, connectionId)}
      active={active}
      positionMs={active ? library.positionMs : 0}
      playing={!!active && library.playing}
      statusText={
        library.error ??
        `${formatLibraryTime(library.positionMs)} / ${formatLibraryTime(active?.durationMs ?? 0)}`
      }
      syncing={sync.syncing}
      syncError={sync.syncError ?? library.storageError ?? (!active ? library.error : null)}
      disabled={!library.hydrated && !active}
      error={!!library.error}
      onRefresh={sync.refresh}
      onClose={() => router.back()}
      onTogglePlay={library.togglePlay}
      onStop={library.stop}
      onPlay={(resourceId) => report(library.play(connectionId, resourceId))}
      onDelete={(resourceId) => report(library.remove(connectionId, resourceId))}
      onScrub={library.scrub}
      onSeek={library.seek}
    />
  );
}
