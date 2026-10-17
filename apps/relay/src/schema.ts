export function hasRoomSchema(sql: SqlStorage): boolean {
  return (
    sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'room'").toArray()
      .length > 0
  );
}

export function initializeRoomSchema(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS room (id TEXT PRIMARY KEY, origin TEXT NOT NULL, expires INTEGER NOT NULL, pair_hash TEXT NOT NULL, pair_expires INTEGER NOT NULL, pair_used INTEGER NOT NULL DEFAULT 0, pair_attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, role TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, object_key TEXT NOT NULL, bytes INTEGER NOT NULL, content_type TEXT NOT NULL, read_hash TEXT NOT NULL, ready INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, read_hash TEXT NOT NULL, project TEXT NOT NULL, project_id TEXT);
    CREATE TABLE IF NOT EXISTS state (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS project (id INTEGER PRIMARY KEY, value TEXT NOT NULL, revision INTEGER NOT NULL, project_id TEXT);
    CREATE TABLE IF NOT EXISTS rates (name TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
  `);
  if (
    !sql
      .exec<{ name: string }>("PRAGMA table_info(room)")
      .toArray()
      .some((column) => column.name === "pair_attempts")
  )
    sql.exec("ALTER TABLE room ADD COLUMN pair_attempts INTEGER NOT NULL DEFAULT 0");
  for (const table of ["project", "shares"]) {
    if (
      !sql
        .exec<{ name: string }>(`PRAGMA table_info(${table})`)
        .toArray()
        .some((column) => column.name === "project_id")
    )
      sql.exec(`ALTER TABLE ${table} ADD COLUMN project_id TEXT`);
  }
}
