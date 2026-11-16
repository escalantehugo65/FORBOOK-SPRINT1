import bcrypt from 'bcryptjs';

// Costo 12: cada hash tarda un poco a propósito, para que adivinar contraseñas sea lento.
const saltRounds = 12;

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Hash de relleno: si el correo no existe, el login igual compara contra algo y tarda lo mismo.
export const fakeHash = bcrypt.hashSync('forbook-dummy-password', saltRounds);
