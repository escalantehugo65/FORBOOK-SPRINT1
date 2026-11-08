// Asigna un rol a una cuenta existente. Es la única forma de dar permisos de moderación:
// el registro público siempre crea estudiantes (FF-6).
// Uso: npm run user:role -- correo@ejemplo.com moderator
import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';

const roles = ['student', 'moderator', 'admin'];
const [email, role] = process.argv.slice(2);
if (!email || !roles.includes(role)) {
  console.error(`Uso: npm run user:role -- correo@ejemplo.com ${roles.join('|')}`);
  process.exit(1);
}
const db = createDatabase(readConfig());
try {
  await db.authenticate();
  const { User } = defineModels(db);
  const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new Error(`No existe una cuenta con el correo ${email}.`);
  await user.update({ role });
  console.log(`Listo: ${user.name} (${user.email}) ahora tiene el rol ${role}. Que recargue la página para ver los cambios.`);
} catch (error) { console.error('No se pudo cambiar el rol:', error.message); process.exitCode = 1; }
finally { await db.close(); }
