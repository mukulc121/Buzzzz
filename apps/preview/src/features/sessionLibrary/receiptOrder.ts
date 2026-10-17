export function createReceiptOrder() {
  const connections = new Map<string, number>();
  const resources = new Map<string, { revision: number; order: number }>();
  let sequence = 0;
  let latest = 0;
  const keyFor = (connectionId: string, resourceId: string) =>
    JSON.stringify([connectionId, resourceId]);
  return {
    begin: (connectionId: string, resourceId: string) => {
      const order = ++sequence;
      const connectionAt = connections.get(connectionId) ?? 0;
      const key = keyFor(connectionId, resourceId);
      const resourceAt = resources.get(key)?.revision ?? 0;
      return () => {
        const resource = resources.get(key);
        if (
          (connections.get(connectionId) ?? 0) !== connectionAt ||
          (resource?.revision ?? 0) !== resourceAt ||
          (resource?.order ?? 0) > order
        )
          return undefined;
        resources.set(key, { revision: resourceAt, order });
        const newest = order >= latest;
        latest = Math.max(latest, order);
        return {
          newest,
          current: () =>
            (connections.get(connectionId) ?? 0) === connectionAt &&
            resources.get(key)?.revision === resourceAt &&
            resources.get(key)?.order === order,
        };
      };
    },
    remove: (connectionId: string, resourceId: string) => {
      const key = keyFor(connectionId, resourceId);
      resources.set(key, { revision: (resources.get(key)?.revision ?? 0) + 1, order: 0 });
    },
    purge: (connectionId: string) => {
      connections.set(connectionId, (connections.get(connectionId) ?? 0) + 1);
    },
  };
}
