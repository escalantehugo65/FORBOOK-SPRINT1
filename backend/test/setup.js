// Cada test lo importa primero: así la API se conecta a la base de pruebas y no a la de backend/.env
// (dotenv no pisa variables que ya existen). Sin TEST_DB_NAME, los tests con MySQL se omiten.
const name = process.env.TEST_DB_NAME;
if (name && !name.endsWith('_test')) throw new Error('TEST_DB_NAME debe terminar en _test: nunca uses la base de tus compañeros para pruebas.');

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1',
  DB_PORT: process.env.TEST_DB_PORT || '3306',
  DB_NAME: name || 'forbook_test',
  DB_USER: process.env.TEST_DB_USER || 'root',
  DB_PASSWORD: process.env.TEST_DB_PASSWORD || '',
  SESSION_SECRET: 'test-only-secret-at-least-32-characters-long',
  SESSION_TTL_HOURS: '1',
  FRONTEND_URL: 'http://localhost:5173',
  TRUST_PROXY: 'false',
});
