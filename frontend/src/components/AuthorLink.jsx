import { Link } from 'react-router-dom';

// Nombre de quien publicó, con enlace a su perfil cuando la cuenta existe.
export default function AuthorLink({ author }) {
  if (!author?.id) return <>{author?.name || 'Usuario de Forbook'}</>;
  return <Link className="author-link" to={`/usuarios/${author.id}`}>{author.name}</Link>;
}
