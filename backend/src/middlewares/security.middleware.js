// Encabezados que piden al navegador no adivinar tipos, no mostrar la API en un iframe y no guardar respuestas.
export const securityHeaders = (req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' });
  next();
};

// Las mutaciones solo se aceptan con JSON y desde el origen exacto del frontend (FRONTEND_URL).
// Para probar con Thunder Client hay que agregar los encabezados Origin y Content-Type.
export const checkOrigin = (origin) => (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('origin') !== origin) return res.status(403).json({ error: { message: 'Origen de la petición no permitido.' } });
    if (!req.is('application/json')) return res.status(415).json({ error: { message: 'La petición debe usar application/json.' } });
  }
  next();
};
