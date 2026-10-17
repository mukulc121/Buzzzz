import { useLocalSearchParams, useRouter } from "expo-router";
import { usePreview } from "../shell/usePreview";
import { MediaLibraryScreen } from "./MediaLibraryScreen";
import { listMediaResources } from "./mediaStorage";
import { mediaStatusText } from "./mediaStatus";
import { useLibraryRefresh } from "./useLibraryRefresh";
import { connectionDisplayName } from "../connection/model";

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
      connectionName={connection ? connectionDisplayName(connection) : "Connection"}
      available={!!connection}
      records={listMediaResources(library.library, connectionId)}
      active={active}
      localUri={library.active?.connectionId === connectionId ? library.active.localUri : undefined}
      clipMissing={library.active?.connectionId === connectionId && library.active.clipMissing}
      downloading={!!active && library.downloading}
      downloadProgress={library.downloadProgress}
      positionMs={active ? library.positionMs : 0}
      playing={!!active && library.playing}
      statusText={mediaStatusText(
        active,
        library.positionMs,
        !!active && library.downloading,
        library.downloadProgress,
        library.error,
      )}
      syncing={sync.syncing}
      syncError={sync.syncError ?? library.storageError ?? (!active ? library.error : null)}
      disabled={(!!active && library.downloading) || (!library.hydrated && !active)}
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
