import { describe, expect, it } from 'vitest';
import { appealError, canAppeal, daysLeft, sanctionLine } from './sanctions';
import { friendsLabel, nextRelation } from './friends';
import { pointsError, sanctionErrors } from './admin';
import { emptyUserContent, userContentBody, validateUserContent } from './userContent';

describe('sanciones', () => {
  const now = new Date('2026-11-24T12:00:00Z').getTime();
  it('resume la sanción con su fecha de fin; la baja no tiene fin', () => {
    expect(sanctionLine({ type: 'suspension', endsAt: '2026-12-01T15:00:00Z' })).toBe('Suspensión hasta el 1 de diciembre de 2026 a las 12:00');
    expect(sanctionLine({ type: 'ban', endsAt: null })).toBe('Baja de la cuenta');
  });
  it('cuenta los días que faltan redondeando para arriba', () => {
    expect(daysLeft('2026-11-24T13:00:00Z', now)).toBe(1);
    expect(daysLeft('2026-12-01T12:00:00Z', now)).toBe(7);
    expect(daysLeft('2026-11-20T12:00:00Z', now)).toBe(0);
    expect(daysLeft(null, now)).toBeNull();
  });
  it('solo deja apelar lo vigente, propio y sin apelar', () => {
    expect(canAppeal({ kind: 'warning', revoked: false, appeal: null }, now)).toBe(true);
    expect(canAppeal({ kind: 'warning', revoked: true, appeal: null }, now)).toBe(false);
    expect(canAppeal({ kind: 'warning', revoked: false, appeal: { status: 'pending' } }, now)).toBe(false);
    expect(canAppeal({ kind: 'sanction', revoked: false, appeal: null, endsAt: '2026-11-23T00:00:00Z' }, now)).toBe(false);
    expect(canAppeal({ kind: 'sanction', revoked: false, appeal: null, endsAt: null }, now)).toBe(true);
  });
  it('pide entre 20 y 1000 caracteres para apelar', () => {
    expect(appealError('corto')).toMatch(/al menos 20/);
    expect(appealError('   ' + 'a'.repeat(20) + '   ')).toBe('');
    expect(appealError('a'.repeat(1001))).toMatch(/1000/);
  });
});

describe('amigos', () => {
  it('nombra la cantidad', () => {
    expect(friendsLabel(1)).toBe('1 amigo');
    expect(friendsLabel(0)).toBe('0 amigos');
    expect(friendsLabel(1200)).toBe('1.200 amigos');
  });
  it('usa la relación que devuelve el backend y, si no viene, la deduce', () => {
    expect(nextRelation('send', { relation: 'friends' })).toBe('friends');
    expect(nextRelation('send', {})).toBe('sent');
    expect(nextRelation('accept')).toBe('friends');
    expect(nextRelation('remove', { relation: 'none' })).toBe('none');
  });
});

describe('panel de administración', () => {
  it('valida la sanción manual como el backend', () => {
    expect(sanctionErrors({ type: 'suspension', reason: 'spam', note: 'Mandó spam en el chat.', days: '7' })).toEqual({});
    expect(sanctionErrors({ type: 'ban', reason: 'harassment', note: 'Acoso a otras personas.', days: '' })).toEqual({});
    expect(Object.keys(sanctionErrors({ type: 'suspension', reason: '', note: 'corta', days: '0' })).sort()).toEqual(['days', 'note', 'reason']);
    expect(sanctionErrors({ type: 'restriction', reason: 'spam', note: 'Mandó spam en el chat.', days: '366' }).days).toBeTruthy();
  });
  it('valida los puntos a mano', () => {
    expect(pointsError('25')).toBe('');
    expect(pointsError('-1000')).toBe('');
    for (const value of ['', '0', '1001', '2.5', 'diez']) expect(pointsError(value)).toBeTruthy();
  });
});

describe('fichas de estudiantes', () => {
  const valid = { ...emptyUserContent, title: 'Feria de los sábados', summary: 'Fruta y verdura más barata.', body: 'Los sábados a la mañana hay feria con precios bajos para estudiantes.', categoryId: '3' };
  it('acepta una experiencia sin fuente', () => {
    expect(validateUserContent(valid)).toEqual({});
  });
  it('pide organismo y enlace https a una fuente oficial', () => {
    expect(Object.keys(validateUserContent({ ...valid, sourceType: 'official' })).sort()).toEqual(['sourceLabel', 'sourceUrl']);
    expect(validateUserContent({ ...valid, sourceType: 'official', sourceLabel: 'SENASA', sourceUrl: 'http://example.com' }).sourceUrl).toMatch(/https/);
    expect(validateUserContent({ ...valid, sourceType: 'official', sourceLabel: 'SENASA', sourceUrl: 'https://www.argentina.gob.ar/senasa' })).toEqual({});
  });
  it('pide una referencia a una fuente comunitaria y revisa los largos', () => {
    expect(validateUserContent({ ...valid, sourceType: 'community' }).sourceLabel).toBeTruthy();
    expect(Object.keys(validateUserContent({ ...valid, title: 'Hola', summary: 'corto', body: 'poco', categoryId: '' })).sort()).toEqual(['body', 'categoryId', 'summary', 'title']);
  });
  it('arma el cuerpo del pedido sin espacios de más', () => {
    expect(userContentBody({ ...valid, title: '  Feria  ', forMyInstitution: true, sourceLabel: ' x ' })).toMatchObject({ title: 'Feria', categoryId: 3, forMyInstitution: true, sourceLabel: 'x' });
  });
});
