import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import Field from '../components/Field';

const initial = { name: '', email: '', password: '', origin: '', institutionId: '', careerId: '', arrivalStatus: '' };
export default function AuthPage({ registration = false, onModeChange, onBusyChange, onDirtyChange, initialNotice = '', titleId = 'access-title' }) {
  const { login, register, checking, error: sessionError, refresh } = useAuth();
  const [values, setValues] = useState(registration ? initial : { email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice] = useState(initialNotice);
  const heading = useRef(null);
  const form = useRef(null);
  const navigate = useNavigate();
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  const loader = useCallback(signal => registration ? catalogService.institutions(signal) : Promise.resolve({ data: [] }), [registration]);
  const careerLoader = useCallback(signal => registration && values.institutionId ? catalogService.careers(values.institutionId, signal) : Promise.resolve({ data: [] }), [registration, values.institutionId]);
  const institutions = useFetch(loader);
  const careers = useFetch(careerLoader);
  function change(event) {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value, ...(name === 'institutionId' ? { careerId: '' } : {}) }));
    setErrors(previous => ({ ...previous, [name]: undefined, ...(name === 'institutionId' ? { careerId: undefined } : {}) }));
    onDirtyChange(true); setError('');
  }
  function validate(keys) {
    const invalid = {};
    for (const key of keys) if (!values[key]?.trim()) invalid[key] = 'Completá este campo.';
    if (keys.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) invalid.email = 'Ingresá un correo válido.';
    if (keys.includes('password') && registration && (values.password.length < 10 || new TextEncoder().encode(values.password).length > 72)) invalid.password = 'Usá al menos 10 caracteres y hasta 72 bytes.';
    for (const [key, min] of [['name', 2], ['origin', 2]]) if (keys.includes(key) && values[key].trim().length < min) invalid[key] = 'Ingresá al menos 2 caracteres.';
    setErrors(invalid);
    if (Object.keys(invalid).length) requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
    return !Object.keys(invalid).length;
  }
  async function submit(event) {
    event.preventDefault(); setError('');
    if (busy) return;
    if (registration && step === 0) {
      if (validate(['name', 'email', 'password'])) setStep(1);
      return;
    }
    if (!validate(registration ? ['origin', 'institutionId', 'careerId', 'arrivalStatus'] : ['email', 'password'])) return;
    setBusy(true);
    try {
      if (registration) {
        const started = await register({ ...values, institutionId: Number(values.institutionId), careerId: Number(values.careerId) });
        if (!started) {
          onDirtyChange(false); onModeChange('login', 'Tu cuenta ya está creada. Iniciá sesión para continuar.'); return;
        }
      } else await login(values);
      navigate('/inicio', { replace: true });
    } catch (error) {
      setError(error.message); setErrors(error.fields || {});
      if (registration && (error.status === 409 || Object.keys(error.fields || {}).some(key => ['name', 'email', 'password'].includes(key)))) setStep(0);
    } finally { setBusy(false); }
  }
  const field = name => ({ name, value: values[name] || '', onChange: change, error: errors[name], required: true, disabled: busy });
  const accountStep = !registration || step === 0;
  const catalogBlocked = registration && step === 1 && (institutions.loading || institutions.error || careers.loading || careers.error || !careers.result?.data.length);
  return <section className="access-content">
    <p className="access-eyebrow">{registration ? 'Tu llegada a Formosa' : 'Qué bueno verte de nuevo'}</p>
    <h2 id={titleId} ref={heading} tabIndex="-1">{registration ? step === 0 ? 'Empezá por vos.' : 'Tu próximo lugar.' : 'Sentite en casa.'}</h2>
    <p className="access-intro">{registration ? step === 0 ? 'Creá tu cuenta para dar los primeros pasos.' : 'Contanos de dónde venís y dónde vas a estudiar.' : 'Ingresá con el correo de tu cuenta.'}</p>
    {registration && <ol className="access-steps" aria-label="Pasos del registro"><li aria-current={step === 0 ? 'step' : undefined}>01 <span>Tu cuenta</span></li><li aria-current={step === 1 ? 'step' : undefined}>02 <span>Tu llegada</span></li></ol>}
    {checking && <p className="access-hint" role="status">Comprobando tu sesión…</p>}
    {sessionError && <div className="access-error" role="alert"><p>{sessionError}</p><button type="button" className="access-text-button" onClick={refresh}>Volver a comprobar</button></div>}
    {notice && <p className="access-notice" role="status">{notice}</p>}
    {error && <p className="access-error" role="alert">{error}</p>}
    <form ref={form} className="access-form" onSubmit={submit} noValidate>
      <fieldset disabled={busy}><legend className="sr-only">{registration ? 'Datos de registro' : 'Datos de acceso'}</legend>
      {accountStep ? <>
        {registration && <Field label="Nombre" autoComplete="name" minLength={2} maxLength={100} {...field('name')}/>}
        <Field label="Correo electrónico" type="email" autoComplete="email" maxLength={254} {...field('email')}/>
        <div className="field access-password"><label htmlFor="password">Contraseña <span aria-hidden="true">*</span></label><div className="access-password-input"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={registration ? 'new-password' : 'current-password'} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : registration ? 'password-hint' : undefined} maxLength={72} {...field('password')} error={undefined}/><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>
          {registration && <small id="password-hint">Al menos 10 caracteres. Usá una clave propia para Forbook.</small>}{errors.password && <small id="password-error" className="field-error">{errors.password}</small>}</div>
      </> : <>
        <Field label="¿De dónde venís?" placeholder="Localidad y provincia o país" autoComplete="off" minLength={2} maxLength={150} {...field('origin')}/>
        <Field label="Institución educativa" {...field('institutionId')} disabled={busy || institutions.loading || !!institutions.error}><option value="">{institutions.loading ? 'Cargando instituciones…' : 'Elegí tu institución'}</option>{institutions.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Field>
        {institutions.error && <div className="access-error" role="alert"><p>{institutions.error.message}</p><button type="button" className="access-text-button" onClick={institutions.retry}>Reintentar instituciones</button></div>}
        <Field label="Carrera" {...field('careerId')} disabled={busy || !values.institutionId || careers.loading || !!careers.error}><option value="">{!values.institutionId ? 'Primero elegí tu institución' : careers.loading ? 'Cargando carreras…' : 'Elegí tu carrera'}</option>{careers.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Field>
        {careers.error && <div className="access-error" role="alert"><p>{careers.error.message}</p><button type="button" className="access-text-button" onClick={careers.retry}>Reintentar carreras</button></div>}
        {values.institutionId && !careers.loading && !careers.error && !careers.result?.data.length && <p className="access-hint" role="status">Todavía no hay carreras cargadas para esta institución.</p>}
        <details className="access-catalog-help"><summary>No encuentro mi carrera</summary><p>Si no aparece en la lista, todavía no podemos completar tu registro. No selecciones una carrera diferente.</p></details>
        <Field label="¿Ya llegaste a Formosa?" {...field('arrivalStatus')}><option value="">Elegí tu situación</option><option value="not_arrived">Todavía no llegué</option><option value="arrived">Ya estoy en Formosa</option></Field>
      </>}
      <button className="welcome-cta access-submit" type="submit" disabled={busy || checking || !!sessionError || !!catalogBlocked}><span>{busy ? 'Procesando…' : registration ? step === 0 ? 'Continuar' : 'Crear mi cuenta' : 'Ingresar'}</span><span aria-hidden="true">→</span></button>
      {registration && step === 1 && <button type="button" className="access-text-button access-back" disabled={busy} onClick={() => { setStep(0); setError(''); }}>← Volver a mi cuenta</button>}
      </fieldset>
    </form>
    <p className="access-switch">{registration ? '¿Ya tenés cuenta?' : '¿Es tu primera vez?'} <button type="button" disabled={busy} onClick={() => onModeChange(registration ? 'login' : 'register')}>{registration ? 'Ingresá' : 'Creá tu cuenta'}</button></p>
  </section>;
}
