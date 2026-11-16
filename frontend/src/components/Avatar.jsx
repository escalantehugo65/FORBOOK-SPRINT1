import { useState } from 'react';
import { apiUrl } from '../services/api';
import { initials } from '../utils/profile';

// Foto de perfil o, si no hay, las iniciales con el color elegido. Puede llevar un marco de la tienda.
// person: { id, name, avatarColor, avatarVersion, decorations }. name y color se siguen aceptando sueltos.
// frame: marco a mostrar (por ejemplo, para la vista previa de la tienda); si no se pasa, el que tiene puesto.
export default function Avatar({ person, name, color, size = '', frame }) {
  const who = person || { name, avatarColor: color };
  const shownFrame = frame !== undefined ? frame : who.decorations?.frame;
  const src = who.id && who.avatarVersion ? apiUrl(`/users/${who.id}/avatar?v=${who.avatarVersion}`) : null;
  // Si la foto no carga (por ejemplo, moderación la quitó hace un momento), se vuelve a las iniciales.
  const [failed, setFailed] = useState(null);
  const photo = src && failed !== src;
  const classes = ['avatar', `avatar-${who.avatarColor || 'azul'}`, size && `avatar-${size}`, photo && 'has-photo', shownFrame && `has-frame frame-${shownFrame}`].filter(Boolean).join(' ');
  return <span className={classes} aria-hidden="true">
    {photo ? <img src={src} alt="" decoding="async" onError={() => setFailed(src)}/> : initials(who.name || '?')}
    {shownFrame && <span className="frame-ornament"/>}
  </span>;
}
