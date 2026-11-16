// Límite de 30 intentos por IP cada 15 minutos. Cada límite lleva su propia cuenta, en memoria.
const rateLimit = () => {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const entry = attempts.get(req.ip) || { count: 0, until: now + 15 * 60000 };
    entry.count++;
    attempts.set(req.ip, entry);
    if (entry.count > 30) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ error: { message: 'Demasiados intentos. Volvé a probar en unos minutos.' } });
    }
    next();
  };
};

export const authLimit = rateLimit(); // registro e inicio de sesión
export const participationLimit = rateLimit(); // preguntas, respuestas y marcas de útil
export const passwordLimit = rateLimit(); // cambio de contraseña
export const reportLimit = rateLimit(); // reportes
export const shopLimit = rateLimit(); // compras en la tienda
export const uploadLimit = rateLimit(); // fotos de perfil
export const communityLimit = rateLimit(); // creación de comunidades
