import session from 'express-session';
import { Op } from 'sequelize';

// El adaptador persiste sesiones en MySQL; no utiliza MemoryStore.
export class MysqlSessionStore extends session.Store {
  constructor(model, ttl) { super(); this.model = model; this.ttl = ttl; }
  get(sid, callback) {
    this.model.findByPk(sid).then(async row => {
      if (!row) return callback(null, null);
      if (new Date(row.expiresAt).getTime() <= Date.now()) { await row.destroy(); return callback(null, null); }
      callback(null, JSON.parse(row.data));
    }).catch(callback);
  }
  set(sid, value, callback = () => {}) {
    this.model.upsert({ sid, data: JSON.stringify(value), expiresAt: value.cookie.expires || new Date(Date.now() + this.ttl) }).then(() => callback()).catch(callback);
  }
  destroy(sid, callback = () => {}) { this.model.destroy({ where: { sid } }).then(() => callback()).catch(callback); }
  touch(sid, value, callback = () => {}) {
    this.model.update({ expiresAt: value.cookie.expires || new Date(Date.now() + this.ttl) }, { where: { sid } }).then(() => callback()).catch(callback);
  }
  prune() { return this.model.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } }); }
}
