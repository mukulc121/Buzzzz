import { useEffect, useRef, useState } from "react";

interface ILibraryRefresh {
  connectionId: string;
  connected: boolean;
  revision: number;
  request: () => void;
}

export function useLibraryRefresh(props: ILibraryRefresh) {
  const { connectionId, connected, revision, request } = props;
  const [state, setState] = useState({
    connectionId,
    revision,
    syncing: false,
    syncError: null as string | null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, [connectionId, revision]);
  const refresh = () => {
    clearTimeout(timer.current);
    if (!connected) {
      setState({
        connectionId,
        revision,
        syncing: false,
        syncError: "This connection is offline.",
      });
      return;
    }
    setState({ connectionId, revision, syncing: true, syncError: null });
    request();
    timer.current = setTimeout(() => {
      setState({ connectionId, revision, syncing: false, syncError: "Studio didn’t answer." });
    }, 8000);
  };
  const current = state.connectionId === connectionId && state.revision === revision;
  return {
    syncing: current && state.syncing,
    syncError: current ? state.syncError : null,
    refresh,
  };
}
