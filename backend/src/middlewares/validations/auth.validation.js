import { body } from 'express-validator';
import { countriesByCode } from '../../helpers/country.helper.js';
import { isId, onlyTheseFields } from './common.validation.js';

const emailRule = () => body('email')
  .isString().withMessage('Ingresá un correo válido.')
  .bail()
  .trim()
  .toLowerCase()
  .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).withMessage('Ingresá un correo válido.')
  .bail()
  .isLength({ max: 254 }).withMessage('Debe tener entre 3 y 254 caracteres.');

// La contraseña no se recorta: los espacios cuentan. bcrypt solo usa los primeros 72 bytes.
const passwordRule = (min) => body('password', `Debe tener entre ${min} y 72 caracteres.`)
  .isString()
  .bail()
  .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('La contraseña debe ocupar como máximo 72 bytes.')
  .isLength({ min, max: 72 });

// El rol no se puede mandar: el registro público siempre crea estudiantes (FF-6).
export const registerValidation = onlyTheseFields([
  body('name', 'Debe tener entre 2 y 100 caracteres.').isString().trim().isLength({ min: 2, max: 100 }),
  emailRule(),
  passwordRule(10),
  body('originCountryCode', 'Elegí un país del catálogo.').custom(value => typeof value === 'string' && countriesByCode.has(value)),
  // De Argentina: una localidad del catálogo (código de 8 dígitos). De otro país: sin localidad.
  body('originLocalityId').custom((value, { req }) => {
    if (req.body.originCountryCode === 'AR') {
      if (typeof value !== 'string' || !/^\d{8}$/.test(value)) throw new Error('Elegí una localidad de Argentina.');
    } else if (value !== undefined && value !== null && value !== '') {
      throw new Error('Para otro país no se envía una localidad argentina.');
    }
    return true;
  }).customSanitizer((value, { req }) => (req.body.originCountryCode === 'AR' ? value : null)),
  body('institutionId', 'Elegí una institución válida.').custom(isId).toInt(),
  body('careerId', 'Elegí una carrera válida.').optional({ values: 'falsy' }).custom(isId).toInt(),
  body('arrivalStatus', 'Elegí tu estado de llegada.').isString().isIn(['arrived', 'not_arrived']),
]);

export const loginValidation = onlyTheseFields([
  emailRule(),
  passwordRule(1),
]);
