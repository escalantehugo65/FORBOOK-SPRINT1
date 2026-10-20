import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { apiRoutes } from './routes/index.js';
import { securityHeaders, checkOrigin } from './middlewares/security.js';
import { errorHandler } from './middlewares/errors.js';

export function createApp({ models, store, config, db }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  const cookie = { httpOnly: true, sameSite: 'lax', secure: config.production, path: '/' };
  app.use(securityHeaders);
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(checkOrigin(config.frontendUrl));
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', async (req, res, next) => {
    try { await db.authenticate(); res.json({ data: { status: 'ok', database: 'connected' } }); } catch (error) { next(error); }
  });
  app.use(session({ name: 'forbook.sid', secret: config.sessionSecret, store, resave: false, saveUninitialized: false, rolling: false,
    cookie: { ...cookie, maxAge: config.sessionTtl } }));
  app.use('/api', apiRoutes(models, cookie));
  app.use((req, res) => res.status(404).json({ error: { message: 'La ruta solicitada no existe.' } }));
  app.use(errorHandler);
  return app;
}
