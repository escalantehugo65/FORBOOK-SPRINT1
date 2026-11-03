import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCredentials, positiveId } from '../src/middlewares/validation.js';

const valid = { name: 'Ana Pérez', email: 'ANA@EXAMPLE.COM ', password: 'una-clave-segura-123', originLocalityId: '34999991', institutionId: 1, careerId: 1, arrivalStatus: 'not_arrived' };
test('normaliza el correo y conserva la contraseña sin recortarla', () => {
  const input = validateCredentials({ ...valid, password: ' una-clave-segura ' }, true);
  assert.equal(input.email, 'ana@example.com'); assert.equal(input.password, ' una-clave-segura ');
});
test('rechaza campos administrativos y cuerpos no válidos', () => {
  for (const input of [{ ...valid, role: 'admin' }, null, [], { ...valid, unexpected: true }]) assert.throws(() => validateCredentials(input, true), error => error.status === 400);
});
test('rechaza datos vacíos, instituciones inválidas y contraseñas truncables por bcrypt', () => {
  for (const change of [{ name: '' }, { originLocalityId: '' }, { originLocalityId: '22000001' }, { originLocalityId: ['34999991'] }, { email: 'incorrecto' }, { institutionId: 0 }, { arrivalStatus: 'unknown' }, { password: 'corta' }, { password: 'á'.repeat(40) }]) assert.throws(() => validateCredentials({ ...valid, ...change }, true), error => error.status === 400);
});
test('los identificadores no aceptan coerciones, inyección ni arrays', () => {
  for (const id of ['1 OR 1=1', -1, '1.2', '', null, ['1'], ['1', '2'], 4294967296]) assert.throws(() => positiveId(id));
  assert.equal(positiveId('12'), 12);
});
