import session from 'express-session';
import { Op } from 'sequelize';
import { config } from './env.js';
import { Session } from '../models/session.model.js';

export const sessionCookieName = 'forbook.sid';

// HttpOnly: el JavaScript del navegador no puede leer la cookie. Secure en producción (solo HTTPS).
export const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.production, path: '/' };

// Guarda las sesiones de express-session en la tabla sessions de MySQL (no en memoria),
// así sobreviven a un reinicio del servidor.
export class MysqlSessionStore extends session.Store {
  constructor(ttl) {
    super();
    this.ttl = ttl;
  }

  get(sid, callback) {
    Session.findByPk(sid).then(async row => {
      if (!row) return callback(null, null);
      if (new Date(row.expiresAt).getTime() <= Date.now()) { await row.destroy(); return callback(null, null); }
      callback(null, JSON.parse(row.data));
    }).catch(callback);
  }

  set(sid, value, callback = () => {}) {
    Session.upsert({ sid, data: JSON.stringify(value), expiresAt: value.cookie.expires || new Date(Date.now() + this.ttl) }).then(() => callback()).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    Session.destroy({ where: { sid } }).then(() => callback()).catch(callback);
  }

  touch(sid, value, callback = () => {}) {
    Session.update({ expiresAt: value.cookie.expires || new Date(Date.now() + this.ttl) }, { where: { sid } }).then(() => callback()).catch(callback);
  }

  // Borra las sesiones vencidas (al arrancar y cada hora, ver app.js).
  prune() {
    return Session.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
  }
}
