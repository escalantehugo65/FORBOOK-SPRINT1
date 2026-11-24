export function Loading({ text = 'Cargando información…' }) {
  return <div className="loading" role="status"><span className="spinner" aria-hidden="true"/>{text}</div>;
}
export function ErrorMessage({ message, retry }) {
  return <div className="alert" role="alert"><p>{message}</p>{retry && <button className="btn btn-outline btn-small" type="button" onClick={retry}>Volver a intentar</button>}</div>;
}
export function EmptyState({ title = 'Todavía no hay contenido', children, action, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  return <div className="empty">
    <Heading>{title}</Heading>
    <p>{children || 'Por ahora no hay nada para mostrar acá.'}</p>
    {action}
  </div>;
}
