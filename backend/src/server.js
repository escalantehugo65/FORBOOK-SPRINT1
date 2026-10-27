import { readConfig } from "./config/env.js";
import { createDatabase } from "./config/database.js";
import { defineModels } from "./models/index.js";
import { MysqlSessionStore } from "./config/sessionStore.js";
import { createApp } from "./app.js";

let db;
try {
  const config = readConfig();
  db = createDatabase(config);
  const models = defineModels(db);
  await db.authenticate();
  await models.Session.findOne(); // Detecta migraciones pendientes antes de escuchar.
  const store = new MysqlSessionStore(models.Session, config.sessionTtl);
  await store.prune();
  const timer = setInterval(
    () =>
      store
        .prune()
        .catch((error) => console.error("Limpieza de sesiones:", error.name)),
    3600000,
  );
  timer.unref();
  const server = createApp({ models, store, config, db }).listen(
    config.port,
    () => console.log(`Forbook API: http://localhost:${config.port}`),
  );
  const stop = () => {
    clearInterval(timer);
    server.close(() => db.close().then(() => process.exit(0)));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(
    "No se pudo iniciar Forbook. Revisá .env, MySQL y las migraciones.",
    error.name,
  );
  if (db) await db.close();
  process.exitCode = 1;
}
