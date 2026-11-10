// Campo con etiqueta, ayuda y error. Si recibe children, dibuja un select con esas opciones.
export default function Field({ label, error, hint, children, name, ...props }) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return <div className="field">
    <label htmlFor={name}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    {children
      ? <select id={name} name={name} aria-invalid={!!error} aria-describedby={describedBy} {...props}>{children}</select>
      : <input id={name} name={name} aria-invalid={!!error} aria-describedby={describedBy} {...props}/>}
    {hint && <small id={`${name}-hint`}>{hint}</small>}
    {error && <small className="field-error" id={`${name}-error`}>{error}</small>}
  </div>;
}
