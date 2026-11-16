import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { matchedData } from 'express-validator';
import { registerValidation } from '../src/middlewares/validations/auth.validation.js';
import { isId } from '../src/middlewares/validations/common.validation.js';
import { validator } from '../src/middlewares/validator.middleware.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';

// Mini app sin base de datos: corre las validaciones del registro y devuelve lo que le llegaría al controlador.
const app = express();
app.use(express.json());
app.post('/registro', registerValidation, validator, (req, res) => res.json(matchedData(req, { locations: ['body'] })));
app.use(errorHandler);
const register = body => request(app).post('/registro').send(body);

const valid = { name: 'Ana Pérez', email: 'ANA@EXAMPLE.COM ', password: 'una-clave-segura-123', originCountryCode: 'AR', originLocalityId: '34999991', institutionId: 1, careerId: 1, arrivalStatus: 'not_arrived' };

test('normaliza el correo y conserva la contraseña sin recortarla', async () => {
  const response = await register({ ...valid, password: ' una-clave-segura ' }).expect(200);
  assert.equal(response.body.email, 'ana@example.com');
  assert.equal(response.body.password, ' una-clave-segura ');
});

test('rechaza campos administrativos y cuerpos no válidos', async () => {
  for (const input of [{ ...valid, role: 'admin' }, [], { ...valid, unexpected: true }]) await register(input).expect(400);
  await request(app).post('/registro').set('Content-Type', 'application/json').send('null').expect(400);
  const extra = await register({ ...valid, role: 'admin' }).expect(400);
  assert.equal(extra.body.error.message, 'La petición contiene campos no permitidos.');
});

test('rechaza datos vacíos, instituciones inválidas y contraseñas truncables por bcrypt', async () => {
  for (const change of [{ name: '' }, { originLocalityId: '' }, { originCountryCode: 'ZZ' }, { originLocalityId: ['34999991'] }, { email: 'incorrecto' }, { institutionId: 0 }, { arrivalStatus: 'unknown' }, { password: 'corta' }, { password: 'á'.repeat(40) }]) {
    await register({ ...valid, ...change }).expect(400);
  }
  // Mismo formato de error que espera el frontend: un mensaje general y uno por campo.
  const response = await register({ ...valid, email: 'incorrecto', password: 'á'.repeat(40) }).expect(400);
  assert.equal(response.body.error.message, 'Revisá los campos indicados.');
  assert.equal(response.body.error.fields.email, 'Ingresá un correo válido.');
  assert.equal(response.body.error.fields.password, 'La contraseña debe ocupar como máximo 72 bytes.');
});

test('los identificadores no aceptan coerciones, inyección ni arrays', async () => {
  for (const id of ['1 OR 1=1', -1, '1.2', '', null, ['1'], ['1', '2'], 4294967296, true]) assert.equal(isId(id), false, JSON.stringify(id));
  assert.equal(isId('12'), true);
  // Un id válido llega al controlador como número.
  assert.equal((await register({ ...valid, institutionId: '12' }).expect(200)).body.institutionId, 12);
});

test('procedencia nacional o exterior sin combinaciones contradictorias', async () => {
  assert.equal((await register({ ...valid, originLocalityId: '02000010' }).expect(200)).body.originCountryCode, 'AR');
  const abroad = await register({ ...valid, originCountryCode: 'PY', originLocalityId: '' }).expect(200);
  assert.equal(abroad.body.originLocalityId, null);
  for (const change of [{ originCountryCode: 'ZZ' }, { originCountryCode: ['AR'] }, { originCountryCode: 'PY' }, { originCountryCode: 'ar' }]) {
    await register({ ...valid, ...change }).expect(400);
  }
});
