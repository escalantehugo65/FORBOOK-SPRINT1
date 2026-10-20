import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import Field from '../components/Field';
import { ErrorMessage, Loading } from '../components/Feedback';

const initial = { name: '', email: '', password: '', origin: '', institutionId: '', career: '', arrivalStatus: '' };
export default function AuthPage({ registration = false }) {
  const { login, register } = useAuth();
  const { values, onChange, errors, setErrors } = useForm(registration ? initial : { email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const loader = useCallback(signal => registration ? catalogService.institutions(signal) : Promise.resolve({ data: [] }), [registration]);
  const institutions = useFetch(loader);
  const submit = async event => {
    event.preventDefault(); setError('');
    const invalid = {};
    for (const [key, value] of Object.entries(values)) if (!value.trim()) invalid[key] = 'Completá este campo.';
    if (registration && (values.password.length < 10 || new TextEncoder().encode(values.password).length > 72)) invalid.password = 'Usá al menos 10 caracteres y hasta 72 bytes.';
    if (Object.keys(invalid).length) { setErrors(invalid); return; }
    setBusy(true);
    try {
      if (registration) {
        const started = await register({ ...values, institutionId: Number(values.institutionId) });
        navigate(started ? '/inicio' : '/ingresar', { replace: true, state: started ? null : { message: 'Tu cuenta fue creada. Iniciá sesión para continuar.' } });
      } else { await login(values); navigate('/inicio', { replace: true }); }
    } catch (error) { setError(error.message); setErrors(error.fields || {}); }
    finally { setBusy(false); }
  };
  const field = name => ({ name, value: values[name], onChange, error: errors[name], required: true, disabled: busy });
  return <section className="container auth-layout"><aside className="auth-aside"><span className="eyebrow">TU PRÓXIMO CAPÍTULO</span><h1>{registration ? <>El primer paso<br/>es conocerte.</> : <>Qué bueno<br/>verte de nuevo.</>}</h1><p>{registration ? 'Un poco de contexto nos ayuda a acompañarte en tu llegada a Formosa.' : 'Tu guía de Formosa, justo donde la dejaste.'}</p><div className="aside-rule"/><span className="aside-caption">FORBOOK / FORMOSA, ARGENTINA</span></aside>
    <div className="form-panel"><span className="eyebrow">{registration ? 'CREÁ TU CUENTA' : 'BIENVENIDO A FORBOOK'}</span><h2>{registration ? 'Empezá tu llegada' : 'Ingresá a tu cuenta'}</h2><p className="form-intro">{registration ? 'Todos los campos son obligatorios. Tu destino es Formosa.' : 'Usá el correo con el que te registraste.'}</p>
      {location.state?.message && <p className="success" role="status">{location.state.message}</p>}{error && <ErrorMessage message={error}/>}
      <form onSubmit={submit} className="auth-form"><fieldset disabled={busy}><legend className="sr-only">{registration ? 'Datos de registro' : 'Datos de acceso'}</legend>
      {registration && <Field label="Nombre" autoComplete="name" minLength={2} maxLength={100} {...field('name')}/>}
      <Field label="Correo electrónico" type="email" autoComplete="email" maxLength={254} {...field('email')}/>
      <Field label="Contraseña" type="password" autoComplete={registration ? 'new-password' : 'current-password'} minLength={registration ? 10 : 1} maxLength={72} hint={registration ? 'Al menos 10 caracteres. No uses tu contraseña académica.' : undefined} {...field('password')}/>
      {registration && <><Field label="¿De dónde venís?" placeholder="Localidad y provincia o país" minLength={2} maxLength={150} {...field('origin')}/>
        {institutions.loading ? <Loading text="Cargando instituciones…"/> : institutions.error ? <ErrorMessage message={institutions.error.message} retry={institutions.retry}/> : <Field label="Institución educativa en Formosa" {...field('institutionId')}><option value="">Elegí tu institución</option>{institutions.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Field>}
        {!institutions.loading && !institutions.error && !institutions.result?.data.length && <p role="status">El catálogo de instituciones todavía está vacío.</p>}
        <Field label="Carrera" minLength={2} maxLength={180} {...field('career')}/><Field label="¿Ya llegaste a Formosa?" {...field('arrivalStatus')}><option value="">Elegí tu situación</option><option value="not_arrived">Todavía no llegué</option><option value="arrived">Ya estoy en Formosa</option></Field></>}
      <button className="button full" type="submit" disabled={busy || (registration && (institutions.loading || !!institutions.error || !institutions.result?.data.length))}>{busy ? 'Procesando…' : registration ? 'Crear mi cuenta' : 'Ingresar'}<span aria-hidden="true">→</span></button></fieldset></form>
      <p className="form-switch">{registration ? '¿Ya tenés cuenta?' : '¿Es tu primera vez?'} <Link to={registration ? '/ingresar' : '/registro'}>{registration ? 'Ingresá' : 'Creá tu cuenta'}</Link></p>
    </div></section>;
}
