// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';
import national from '../../../backend/seeders/data/argentina-localities.json';
import countryData from '../../../backend/seeders/data/countries.json';

const mock = vi.hoisted(() => ({ register: vi.fn(), countries: vi.fn(), localities: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ register: mock.register, login: vi.fn(), checking: false, error: null, refresh: vi.fn() }) }));
vi.mock('../services/catalog', () => ({ catalogService: {
  localities: (...args) => mock.localities(...args), countries: (...args) => mock.countries(...args),
  institutions: async () => ({ data: [{ id: 1, name: 'IPF' }, { id: 2, name: 'Universidad Nacional de Formosa (UNaF)' }] }),
  careers: async id => ({ data: id === '1' ? [{ id: 10, name: 'Mecatrónica' }] : [] }),
} }));

async function arrivalStep() {
  const user = userEvent.setup();
  render(<MemoryRouter><AuthPage registration onBusyChange={vi.fn()} onDirtyChange={vi.fn()} onModeChange={vi.fn()}/></MemoryRouter>);
  await user.type(screen.getByLabelText(/^Nombre/), 'Estudiante de prueba');
  await user.type(screen.getByLabelText(/^Correo electrónico/), 'test@example.invalid');
  await user.type(screen.getByLabelText(/^Contraseña/), 'Clave-prueba-2026');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('option', { name: 'Formosa' });
  return user;
}
beforeEach(() => {
  mock.register.mockReset().mockResolvedValue(true);
  mock.localities.mockReset().mockResolvedValue({ data: national.localities });
  mock.countries.mockReset().mockResolvedValue({ data: countryData.countries });
});
afterEach(cleanup);

describe('registro con procedencias de Argentina y del exterior', () => {
  it('ofrece las 24 jurisdicciones y borra la localidad al cambiar de provincia', async () => {
    const user = await arrivalStep();
    const province = screen.getByLabelText(/^Provincia/);
    expect(province.options.length).toBe(25);
    await user.selectOptions(province, '34');
    await user.type(screen.getByLabelText('Buscar localidad'), 'pirane');
    await user.selectOptions(screen.getByLabelText(/^Localidad de procedencia/), screen.getByRole('option', { name: 'Pirané' }).value);
    expect(screen.getByLabelText(/^Localidad de procedencia/).value).not.toBe('');
    await user.selectOptions(province, '22');
    expect(screen.getByLabelText(/^Localidad de procedencia/).value).toBe('');
    expect(screen.getByLabelText('Buscar localidad').value).toBe('');
    expect([...screen.getByLabelText(/^Localidad de procedencia/).options].some(item => item.text === 'Resistencia')).toBe(true);
  });
  it('muestra 248 países exteriores y envía un registro sin localidad argentina', async () => {
    const user = await arrivalStep();
    await user.selectOptions(screen.getByLabelText(/^¿De dónde venís/), 'outside');
    expect(screen.queryByLabelText(/^Provincia/)).toBeNull();
    expect(screen.queryByLabelText(/^Localidad de procedencia/)).toBeNull();
    const country = screen.getByLabelText(/^País de procedencia/);
    expect(country.options.length).toBe(249); // 248 exteriores y una opción vacía.
    expect([...country.options].some(item => item.value === 'AR')).toBe(false);
    await user.selectOptions(country, 'PY');
    await user.selectOptions(screen.getByLabelText(/^Institución educativa/), '1');
    await screen.findByRole('option', { name: 'Mecatrónica' });
    await user.selectOptions(screen.getByLabelText(/^Carrera/), '10');
    await user.click(screen.getByLabelText('Todavía no llegué'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await waitFor(() => expect(mock.register).toHaveBeenCalledOnce());
    expect(mock.register.mock.calls[0][0]).toMatchObject({ originCountryCode: 'PY', originLocalityId: '', institutionId: 1, careerId: 10 });
  });
  it('exige país y permite carrera pendiente únicamente cuando no hay catálogo', async () => {
    const user = await arrivalStep();
    await user.selectOptions(screen.getByLabelText(/^¿De dónde venís/), 'outside');
    await user.selectOptions(screen.getByLabelText(/^Institución educativa/), '2');
    await screen.findByText(/Podés crear tu cuenta con la carrera pendiente/);
    await user.click(screen.getByLabelText('Ya estoy en Formosa'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(mock.register).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^País de procedencia/).getAttribute('aria-invalid')).toBe('true');
    await user.selectOptions(screen.getByLabelText(/^País de procedencia/), 'UY');
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await waitFor(() => expect(mock.register).toHaveBeenCalledOnce());
    expect(mock.register.mock.calls[0][0]).toMatchObject({ originCountryCode: 'UY', careerId: null });
  });
  it('al volver a Argentina limpia el país exterior y pide una localidad', async () => {
    const user = await arrivalStep();
    const mode = screen.getByLabelText(/^¿De dónde venís/);
    await user.selectOptions(mode, 'outside');
    await user.selectOptions(screen.getByLabelText(/^País de procedencia/), 'BR');
    await user.selectOptions(mode, 'AR');
    expect(screen.queryByLabelText(/^País de procedencia/)).toBeNull();
    expect(screen.getByLabelText(/^Provincia/).value).toBe('');
    expect(screen.getByLabelText(/^Localidad de procedencia/).disabled).toBe(true);
  });
});
