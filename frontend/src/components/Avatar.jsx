import { initials } from '../utils/profile';

// Avatar con las iniciales y el color que eligió la persona en su perfil.
export default function Avatar({ name, color = 'azul', size = '' }) {
  return <span className={`avatar avatar-${color}${size ? ` avatar-${size}` : ''}`} aria-hidden="true">{initials(name || '?')}</span>;
}
