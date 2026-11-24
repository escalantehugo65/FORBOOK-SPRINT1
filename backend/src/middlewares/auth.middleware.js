import { accountStatus, blocksAccess, blocksParticipation } from '../helpers/sanction.helper.js';
import { isActiveAccount } from '../helpers/account.helper.js';
import { sessionCall } from '../helpers/session.helper.js';

// Si la cuenta se dio de baja (o ya no existe), la sesión que quedaba deja de servir.
const endedSession = async (req, res) => {
  await sessionCall(req, 'destroy').catch(() => {});
  return res.status(401).json({ error: { message: 'Tu sesión ya no es válida.' } });
};

const dateText = (date) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(date);

// Deja pasar solo si hay una sesión iniciada. La sesión vive en MySQL (tabla sessions),
// así que no hay token en el navegador: alcanza con la cookie forbook.sid.
// Una cuenta suspendida o baneada no pasa: solo puede ver su sanción, apelar y cerrar sesión (sessionMiddleware).
export const authMiddleware = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: { message: 'Iniciá sesión para continuar.' } });
  }
  if (!await isActiveAccount(req.session.userId)) return endedSession(req, res);
  const status = await accountStatus(req.session.userId);
  req.account = status;
  if (blocksAccess(status.state)) {
    const until = status.sanction.endsAt ? ` hasta el ${dateText(status.sanction.endsAt)}` : '';
    return res.status(403).json({ error: { message: status.state === 'banned' ? 'Tu cuenta fue dada de baja por moderación.' : `Tu cuenta está suspendida${until}.`, code: 'account_suspended' } });
  }
  next();
};

// Solo comprueba la sesión, sin mirar las sanciones: para ver la propia cuenta, las sanciones y apelar.
export const sessionMiddleware = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: { message: 'Iniciá sesión para continuar.' } });
  }
  if (!await isActiveAccount(req.session.userId)) return endedSession(req, res);
  next();
};

// Va después de authMiddleware en todo lo que publica algo: preguntas, respuestas, fichas, mensajes y comunidades.
// Una cuenta con restricción puede leer, pero no publicar hasta que termine.
export const participationMiddleware = (req, res, next) => {
  const status = req.account;
  if (status && blocksParticipation(status.state)) {
    const until = status.sanction.endsAt ? ` hasta el ${dateText(status.sanction.endsAt)}` : '';
    return res.status(403).json({ error: { message: `Tu cuenta tiene una restricción${until}: podés leer, pero no publicar. Mirá el motivo en Mis sanciones.`, code: 'account_restricted' } });
  }
  next();
};
