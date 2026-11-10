import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import Field from '../components/Field';

const initial = { name: '', email: '', password: '', originCountryCode: 'AR', originLocalityId: '', institutionId: '', careerId: '', arrivalStatus: '' };
const normalize = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Solo se vuelve a rutas internas de Forbook después de ingresar.
const safeDestination = path => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/inicio';
function groupByDepartment(items) {
  const groups = new Map();
  for (const item of items) groups.set(item.departmentName, [...(groups.get(item.departmentName) || []), item]);
  return groups;
}

export default function AuthPage({ registration = false, returnTo, onModeChange, onBusyChange, onDirtyChange, initialNotice = '', titleId = 'access-title' }) {
  const { login, register, checking, error: sessionError, refresh } = useAuth();
  const [values, setValues] = useState(registration ? initial : { email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [originMode, setOriginMode] = useState('AR');
  const [provinceCode, setProvinceCode] = useState('');
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice] = useState(initialNotice);
  const heading = useRef(null);
  const form = useRef(null);
  const navigate = useNavigate();
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  const institutionLoader = useCallback(signal => registration ? catalogService.institutions(signal) : Promise.resolve({ data: [] }), [registration]);
  const careerLoader = useCallback(signal => registration && values.institutionId ? catalogService.careers(values.institutionId, signal) : Promise.resolve({ data: [] }), [registration, values.institutionId]);
  const localityLoader = useCallback(signal => registration ? catalogService.localities(signal) : Promise.resolve({ data: [] }), [registration]);
  const countryLoader = useCallback(signal => registration ? catalogService.countries(signal) : Promise.resolve({ data: [] }), [registration]);
  const countries = useFetch(countryLoader);
  const localities = useFetch(localityLoader);
  const institutions = useFetch(institutionLoader);
  const careers = useFetch(careerLoader);
  const provinces = [...new Map((localities.result?.data || []).map(item => [item.provinceCode, item.provinceName || 'Formosa'])).entries()].sort((a,b) => a[1].localeCompare(b[1], 'es'));
  const visibleLocalities = (localities.result?.data || []).filter(item => item.provinceCode === provinceCode && normalize(`${item.name} ${item.departmentName}`).includes(normalize(localitySearch.trim())));
  const visibleInstitutions = (institutions.result?.data || []).filter(item => normalize(item.name).includes(normalize(institutionSearch.trim())));
  const localityGroups = groupByDepartment(visibleLocalities);

  function change(event) {
    const { name, value } = event.target;
    // Si cambia la institución, la carrera elegida deja de ser válida.
    setValues(previous => ({ ...previous, [name]: value, ...(name === 'institutionId' ? { careerId: '' } : {}) }));
    setErrors(previous => ({ ...previous, [name]: undefined, ...(name === 'institutionId' ? { careerId: undefined } : {}) }));
    onDirtyChange(true); setError('');
  }
  function validate(keys) {
    const invalid = {};
    for (const key of keys) if (!values[key]?.trim()) invalid[key] = 'Completá este campo.';
    if (keys.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) invalid.email = 'Ingresá un correo válido.';
    if (keys.includes('password') && registration && (values.password.length < 10 || new TextEncoder().encode(values.password).length > 72)) invalid.password = 'Usá al menos 10 caracteres y hasta 72 bytes.';
    if (keys.includes('name') && values.name.trim().length < 2) invalid.name = 'Ingresá al menos 2 caracteres.';
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
    if (!validate(registration ? [...(originMode === 'AR' ? ['originLocalityId'] : ['originCountryCode']), 'institutionId', ...(careers.result?.data.length ? ['careerId'] : []), 'arrivalStatus'] : ['email', 'password'])) return;
    setBusy(true);
    try {
      if (registration) {
        const started = await register({ ...values, institutionId: Number(values.institutionId), careerId: values.careerId ? Number(values.careerId) : null });
        if (!started) {
          // La cuenta existe pero la sesión no se abrió: se pide ingresar en lugar de crear otra cuenta.
          onDirtyChange(false); onModeChange('login', 'Tu cuenta ya está creada. Iniciá sesión para continuar.'); return;
        }
      } else await login(values);
      navigate(safeDestination(returnTo), { replace: true });
    } catch (failure) {
      setError(failure.message); setErrors(failure.fields || {});
      if (registration && (failure.status === 409 || Object.keys(failure.fields || {}).some(key => ['name', 'email', 'password'].includes(key)))) setStep(0);
    } finally { setBusy(false); }
  }

  const field = name => ({ name, value: values[name] || '', onChange: change, error: errors[name], required: true, disabled: busy });
  const accountStep = !registration || step === 0;
  const catalogBlocked = registration && step === 1 && ((originMode === 'AR' ? localities.loading || localities.error || !localities.result?.data.length : countries.loading || countries.error || !countries.result?.data.length) || institutions.loading || institutions.error || careers.loading || careers.error);
  const title = registration ? (step === 0 ? 'Creá tu cuenta' : 'Contanos de tu llegada') : 'Ingresá a Forbook';
  const intro = registration
    ? (step === 0 ? 'Con tu nombre, tu correo y una contraseña propia para Forbook.' : 'De dónde venís, dónde vas a estudiar y si ya llegaste a la ciudad.')
    : 'Usá el correo y la contraseña de tu cuenta.';
  const submitLabel = busy ? 'Procesando…' : registration ? (step === 0 ? 'Continuar' : 'Crear mi cuenta') : 'Ingresar';

  return <section className="access-content">
    <div className="access-heading">
      <p className="eyebrow">{registration ? 'Tu llegada a Formosa' : 'Qué bueno verte de nuevo'}</p>
      <h2 id={titleId} ref={heading} tabIndex="-1">{title}</h2>
      <p className="access-intro">{intro}</p>
    </div>
    {registration && <ol className="steps" aria-label="Pasos del registro">
      <li aria-current={step === 0 ? 'step' : undefined} className={step > 0 ? 'done' : undefined}>Paso 1 · Tu cuenta</li>
      <li aria-current={step === 1 ? 'step' : undefined}>Paso 2 · Tu llegada</li>
    </ol>}
    {checking && <p className="access-hint" role="status">Comprobando tu sesión…</p>}
    {sessionError && <div className="alert" role="alert"><p>{sessionError}</p><button type="button" className="btn btn-outline btn-small" onClick={refresh}>Volver a comprobar</button></div>}
    {notice && <p className="access-notice" role="status">{notice}</p>}
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <form ref={form} className="access-form" onSubmit={submit} noValidate>
      <fieldset className="access-fields" disabled={busy}>
        <legend className="sr-only">{registration ? 'Datos de registro' : 'Datos de acceso'}</legend>
        {accountStep ? <>
          {registration && <Field label="Nombre" autoComplete="name" minLength={2} maxLength={100} {...field('name')}/>}
          <Field label="Correo electrónico" type="email" autoComplete="email" maxLength={254} {...field('email')}/>
          <div className="field">
            <label htmlFor="password">Contraseña <span aria-hidden="true">*</span></label>
            <div className="password-input">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={registration ? 'new-password' : 'current-password'} maxLength={72} required
                value={values.password} onChange={change} disabled={busy} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : registration ? 'password-hint' : undefined}/>
              <button type="button" className="btn btn-outline btn-small" onClick={() => setShowPassword(shown => !shown)}>{showPassword ? 'Ocultar' : 'Mostrar'}<span className="sr-only"> contraseña</span></button>
            </div>
            {registration && <small id="password-hint">Al menos 10 caracteres. Usá una clave propia para Forbook.</small>}
            {errors.password && <small id="password-error" className="field-error">{errors.password}</small>}
          </div>
        </> : <>
          <Field name="origin-mode" label="¿De dónde venís?" value={originMode} required disabled={busy} onChange={event => {
            const mode = event.target.value; setOriginMode(mode); setProvinceCode(''); setLocalitySearch('');
            setValues(previous => ({ ...previous, originCountryCode: mode === 'AR' ? 'AR' : '', originLocalityId: '' }));
            setErrors(previous => ({ ...previous, originLocalityId: undefined, originCountryCode: undefined })); onDirtyChange(true);
          }}>
            <option value="AR">Soy de Argentina</option>
            <option value="outside">No soy de Argentina</option>
          </Field>
          {originMode === 'AR' ? <>
            <Field name="province" label="Provincia de procedencia" value={provinceCode} required disabled={busy || localities.loading || !!localities.error} onChange={event => {
              setProvinceCode(event.target.value); setLocalitySearch(''); setValues(previous => ({ ...previous, originLocalityId: '' })); onDirtyChange(true);
            }}>
              <option value="">{localities.loading ? 'Cargando provincias…' : 'Elegí tu provincia'}</option>
              {provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </Field>
            <div className="field">
              <label htmlFor="locality-search">Buscar localidad</label>
              <input id="locality-search" type="search" placeholder="Nombre o departamento" value={localitySearch} disabled={busy || !provinceCode || localities.loading || !!localities.error}
                onChange={event => { setLocalitySearch(event.target.value); setValues(previous => ({ ...previous, originLocalityId: '' })); setErrors(previous => ({ ...previous, originLocalityId: undefined })); onDirtyChange(true); }}/>
            </div>
            <Field label="Localidad de procedencia" hint="Localidades censales de Argentina, según el catálogo oficial Georef." {...field('originLocalityId')} disabled={busy || !provinceCode || localities.loading || !!localities.error}>
              <option value="">{!provinceCode ? 'Primero elegí tu provincia' : 'Elegí tu localidad'}</option>
              {[...localityGroups].map(([department, items]) => <optgroup key={department} label={department}>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}
            </Field>
            {localities.error && <div className="alert" role="alert"><p>{localities.error.message}</p><button type="button" className="btn btn-outline btn-small" onClick={localities.retry}>Reintentar localidades</button></div>}
            {provinceCode && !localities.loading && !localities.error && !visibleLocalities.length && <p className="access-hint" role="status">No encontramos localidades con esa búsqueda.</p>}
          </> : <>
            <Field label="País de procedencia" {...field('originCountryCode')} disabled={busy || countries.loading || !!countries.error} hint="Países y territorios del catálogo ISO 3166-1.">
              <option value="">{countries.loading ? 'Cargando países…' : 'Elegí tu país'}</option>
              {countries.result?.data.filter(item => item.code !== 'AR').sort((a, b) => a.name.localeCompare(b.name, 'es')).map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </Field>
            {countries.error && <div className="alert" role="alert"><p>{countries.error.message}</p><button type="button" className="btn btn-outline btn-small" onClick={countries.retry}>Reintentar países</button></div>}
          </>}
          <div className="field"><label htmlFor="institution-search">Buscar institución</label><input id="institution-search" type="search" placeholder="Nombre o localidad de la institución" value={institutionSearch} disabled={busy || institutions.loading || !!institutions.error} onChange={event => {
            setInstitutionSearch(event.target.value); setValues(previous => ({ ...previous, institutionId: '', careerId: '' })); onDirtyChange(true);
          }}/></div>
          <Field label="Institución educativa" hint="Por ahora, Forbook acompaña a estudiantes de UNaF e IPF." {...field('institutionId')} disabled={busy || institutions.loading || !!institutions.error}>
            <option value="">{institutions.loading ? 'Cargando instituciones…' : 'Elegí tu institución'}</option>
            {visibleInstitutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Field>
          {!institutions.loading && !institutions.error && !visibleInstitutions.length && <p className="access-hint" role="status">No encontramos instituciones con esa búsqueda.</p>}
          {institutions.error && <div className="alert" role="alert"><p>{institutions.error.message}</p><button type="button" className="btn btn-outline btn-small" onClick={institutions.retry}>Reintentar instituciones</button></div>}
          <Field label="Carrera" {...field('careerId')} required={!!careers.result?.data.length} disabled={busy || !values.institutionId || careers.loading || !!careers.error || !careers.result?.data.length}>
            <option value="">{!values.institutionId ? 'Primero elegí tu institución' : careers.loading ? 'Cargando carreras…' : !careers.result?.data.length ? 'Carreras pendientes de catálogo' : 'Elegí tu carrera'}</option>
            {careers.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Field>
          {careers.error && <div className="alert" role="alert"><p>{careers.error.message}</p><button type="button" className="btn btn-outline btn-small" onClick={careers.retry}>Reintentar carreras</button></div>}
          {values.institutionId && !careers.loading && !careers.error && !careers.result?.data.length && <p className="access-hint" role="status">Las carreras de esta institución están en revisión. Podés crear tu cuenta con la carrera pendiente, sin elegir una que no te corresponde.</p>}
          <details className="access-help"><summary>No encuentro mi carrera</summary><p>El catálogo incluye carreras verificadas y puede estar incompleto. No elijas una carrera diferente. Si todavía no cargamos ninguna para tu institución, podés continuar con la carrera pendiente.</p></details>
          <fieldset className="choice-group">
            <legend>¿Ya llegaste a Formosa? <span aria-hidden="true">*</span></legend>
            <div className="choice-row">
              {[['not_arrived', 'Todavía no llegué'], ['arrived', 'Ya estoy en Formosa']].map(([value, label]) => <label className="choice" key={value}>
                <input type="radio" name="arrivalStatus" value={value} checked={values.arrivalStatus === value} onChange={change} required disabled={busy}
                  aria-invalid={!!errors.arrivalStatus} aria-describedby={errors.arrivalStatus ? 'arrivalStatus-error' : undefined}/>{label}
              </label>)}
            </div>
            {errors.arrivalStatus && <small id="arrivalStatus-error" className="field-error">{errors.arrivalStatus}</small>}
          </fieldset>
        </>}
        <div className="form-actions">
          {registration && step === 1 && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setStep(0); setError(''); }}>Volver</button>}
          <button className="btn btn-primary btn-large" type="submit" disabled={busy || checking || !!sessionError || !!catalogBlocked}>{submitLabel}</button>
        </div>
      </fieldset>
    </form>
    <p className="access-switch">{registration ? '¿Ya tenés cuenta?' : '¿Es tu primera vez?'} <button className="link-button" type="button" disabled={busy} onClick={() => onModeChange(registration ? 'login' : 'register')}>{registration ? 'Ingresá' : 'Creá tu cuenta'}</button></p>
  </section>;
}
