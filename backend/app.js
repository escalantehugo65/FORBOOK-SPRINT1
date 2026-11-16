import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from './src/config/env.js';
import { sequelize, startDB } from './src/config/database.js';
import { MysqlSessionStore, cookieOptions, sessionCookieName } from './src/config/session.js';
import { checkOrigin, securityHeaders } from './src/middlewares/security.middleware.js';
import { errorHandler, notFound } from './src/middlewares/error.middleware.js';
import { authRouter } from './src/routes/auth.route.js';
import { localityRouter } from './src/routes/locality.route.js';
import { institutionRouter } from './src/routes/institution.route.js';
import { categoryRouter } from './src/routes/category.route.js';
import { contentRouter } from './src/routes/content.route.js';
import { placeRouter } from './src/routes/place.route.js';
import { travelRouteRouter } from './src/routes/travel_route.route.js';
import { groupRouter } from './src/routes/group.route.js';
import { questionRouter } from './src/routes/question.route.js';
import { answerRouter } from './src/routes/answer.route.js';
import { profileRouter } from './src/routes/profile.route.js';
import { userWarningRouter } from './src/routes/user_warning.route.js';
import { reportRouter } from './src/routes/report.route.js';
import { moderationLogRouter } from './src/routes/moderation_log.route.js';

const store = new MysqlSessionStore(config.sessionTtl);
export const app = express();

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(checkOrigin(config.frontendUrl));
app.use(express.json({ limit: '16kb' }));

// Antes de las sesiones: comprobar que la API anda no crea una sesión nueva.
app.get('/api/health', async (req, res) => {
  await sequelize.authenticate();
  res.json({ data: { status: 'ok', database: 'connected' } });
});

app.use(session({
  name: sessionCookieName,
  secret: config.sessionSecret,
  store,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: { ...cookieOptions, maxAge: config.sessionTtl },
}));

app.use('/api', authRouter);
app.use('/api', localityRouter);
app.use('/api', institutionRouter);
app.use('/api', categoryRouter);
app.use('/api', contentRouter);
app.use('/api', placeRouter);
app.use('/api', travelRouteRouter);
app.use('/api', groupRouter);
app.use('/api', questionRouter);
app.use('/api', answerRouter);
app.use('/api', profileRouter);
app.use('/api', userWarningRouter);
app.use('/api', reportRouter);
app.use('/api', moderationLogRouter);

app.use(notFound);
app.use(errorHandler);

// Primero se conecta la base y después se abre el puerto: si algo falla, el servidor no queda a medias.
const startServer = async () => {
  try {
    await startDB();
    // Si faltan migraciones, esto falla porque no existe la tabla sessions.
    await store.prune();
    const timer = setInterval(() => store.prune().catch(error => console.error('Limpieza de sesiones:', error.name)), 3600000);
    timer.unref();
    const server = app.listen(config.port, () => console.log(`Forbook API: http://localhost:${config.port}`));
    const stop = () => {
      clearInterval(timer);
      server.close(() => sequelize.close().then(() => process.exit(0)));
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  } catch (error) {
    console.error('No se pudo iniciar Forbook. Revisá .env, MySQL y las migraciones.', error.message);
    await sequelize.close();
    process.exitCode = 1;
  }
};

// Los tests importan app sin abrir el puerto (test/setup.js pone NODE_ENV=test).
if (process.env.NODE_ENV !== 'test') startServer();
