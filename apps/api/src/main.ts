import { serve } from "@hono/node-server";
import { buildApp } from "./app";
import { type Config, ConfigError, loadConfig } from "./config";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
const { app, db, scheduler } = buildApp(config);

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`✓ API de Mini Galú en http://localhost:${info.port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    scheduler.stop();
    server.close();
    void db.close().finally(() => process.exit(0));
  });
}
