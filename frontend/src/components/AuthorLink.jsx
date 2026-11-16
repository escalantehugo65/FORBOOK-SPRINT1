import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';

// Nombre de quien publicó, con enlace a su perfil cuando la cuenta existe.
// Muestra el color del nombre y, con withAvatar, la foto chica con su marco.
export default function AuthorLink({ author, withAvatar = false }) {
  const avatar = withAvatar && <Avatar person={author} size="small"/>;
  const name = <DecoratedName name={author?.name || 'Usuario de Forbook'} color={author?.decorations?.nameColor}/>;
  if (!author?.id) return <span className="author">{avatar}{name}</span>;
  return <Link className="author-link" to={`/usuarios/${author.id}`}>{avatar}{name}</Link>;
}
