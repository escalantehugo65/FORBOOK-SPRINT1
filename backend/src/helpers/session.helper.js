// express-session trabaja con callbacks; esto permite usar await req.session.save() y compañía.
export const sessionCall = (req, method) => new Promise((resolve, reject) => {
  req.session[method](error => (error ? reject(error) : resolve()));
});

// Se regenera el id de sesión al entrar (evita fijación de sesión) y se guarda solo el id del usuario.
export const startSession = async (req, userId) => {
  await sessionCall(req, 'regenerate');
  req.session.userId = userId;
  await sessionCall(req, 'save');
};
