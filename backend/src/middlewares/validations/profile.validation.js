import { body } from 'express-validator';
import { profileOptions } from '../../helpers/profile.helper.js';
import { idParam, isBoolean, moderationNote, onlyTheseFields } from './common.validation.js';

const maxYear = () => new Date().getFullYear() + 1;

// PUT /profile: descripción, decoración, intereses, año de ingreso y privacidad.
export const updateProfileValidation = [
  ...onlyTheseFields([
    body('bio', 'La descripción puede tener hasta 280 caracteres.').optional({ values: 'null' }).isString().trim().isLength({ max: 280 }),
    body('avatarColor', 'Elegí un color de la lista.').isString().isIn(profileOptions.avatarColors),
    body('bannerStyle', 'Elegí un fondo de la lista.').isString().isIn(profileOptions.bannerStyles),
    body('interests')
      .custom(value => Array.isArray(value) && value.every(item => profileOptions.interests.includes(item))).withMessage('Elegí intereses de la lista.')
      .bail()
      .customSanitizer(value => [...new Set(value)])
      .custom(value => value.length <= profileOptions.maxInterests).withMessage(`Podés elegir hasta ${profileOptions.maxInterests} intereses.`),
    // Vacío = sin año.
    body('cohortYear')
      .optional({ values: 'falsy' })
      .custom(value => Number.isInteger(value) && value >= 1990 && value <= maxYear())
      .withMessage(() => `Elegí un año entre 1990 y ${maxYear()}.`),
    body('showOrigin', 'Elegí sí o no.').custom(isBoolean),
    body('showArrival', 'Elegí sí o no.').custom(isBoolean),
  ]),
];

// La actual se pide siempre; la nueva sigue la misma regla que el registro.
export const changePasswordValidation = [
  ...onlyTheseFields([
    body('currentPassword', 'Escribí tu contraseña actual.').isString().notEmpty(),
    body('newPassword', 'La nueva contraseña debe tener entre 10 y 72 caracteres.')
      .isString()
      .bail()
      .isLength({ min: 10, max: 72 })
      .custom(value => Buffer.byteLength(value, 'utf8') <= 72)
      .bail()
      .custom((value, { req }) => value !== req.body.currentPassword).withMessage('La nueva contraseña tiene que ser distinta de la actual.'),
  ]),
];

export const userIdValidation = [idParam('Usuario inválido.')];

// Moderación: ocultar o volver a mostrar la descripción de un perfil.
export const bioVisibilityValidation = [idParam('Usuario inválido.'), ...moderationNote()];
