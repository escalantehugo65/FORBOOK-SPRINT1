import 'dotenv/config';

// Lee backend/.env una sola vez. Si falta algo importante, el servidor no arranca y avisa qué revisar.
const env = process.env;

for (const name of ['DB_HOST', 'DB_NAME', 'DB_USER', 'SESSION_SECRET', 'FRONTEND_URL']) {
  if (!env[name] || env[name].startsWith('REEMPLAZAR')) throw new Error(`Configurá ${name} en backend/.env.`);
}
// WAMP o XAMPP pueden usar root sin contraseña, pero la variable tiene que estar declarada.
if (typeof env.DB_PASSWORD !== 'string' || env.DB_PASSWORD.startsWith('REEMPLAZAR')) throw new Error('Configurá DB_PASSWORD en backend/.env (puede estar vacía en desarrollo local).');
const localDatabase = ['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST);
if (!env.DB_PASSWORD && (!['development', 'test'].includes(env.NODE_ENV) || !localDatabase)) throw new Error('La contraseña vacía solo se permite en desarrollo con una base local.');
if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
const frontendUrl = new URL(env.FRONTEND_URL);
if (!['http:', 'https:'].includes(frontendUrl.protocol) || frontendUrl.origin !== env.FRONTEND_URL) throw new Error('FRONTEND_URL debe ser un origen sin ruta ni barra final.');

const number = (name, fallback, max) => {
  const value = Number(env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${name} no es válido.`);
  return value;
};

export const config = {
  production: env.NODE_ENV === 'production',
  port: number('PORT', 3001, 65535),
  db: { host: env.DB_HOST, port: number('DB_PORT', 3306, 65535), database: env.DB_NAME, username: env.DB_USER, password: env.DB_PASSWORD },
  frontendUrl: frontendUrl.origin,
  sessionSecret: env.SESSION_SECRET,
  sessionTtl: number('SESSION_TTL_HOURS', 24, 720) * 3600000,
  trustProxy: env.TRUST_PROXY === 'true',
};
