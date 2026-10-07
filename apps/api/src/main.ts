import { serve } from "@hono/node-server";
import { buildApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
const { app, db } = buildApp(config);

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`✓ API de Mini Galú en http://localhost:${info.port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    server.close();
    void db.close().finally(() => process.exit(0));
  });
}
