import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import LevelBadge from './LevelBadge';
import ProfileEffect from './ProfileEffect';
import { noDecorations } from '../utils/shop';

// Tarjeta chica de un perfil con sus decoraciones: la usan la tienda (vista previa) y la bienvenida.
// person: { name, avatarColor, avatarVersion, bannerStyle, level }; decorations: { frame, banner, effect, nameColor }.
export default function ProfileCardPreview({ person, decorations = noDecorations, subtitle, className = '' }) {
  const banner = decorations.banner || person.bannerStyle || 'rio';
  return <div className={`mini-profile ${className}`.trim()}>
    <div className={`mini-banner banner-${banner}`}/>
    <ProfileEffect effect={decorations.effect} dense={false}/>
    <div className="mini-identity">
      <Avatar person={{ ...person, decorations }} size="mini"/>
      <div className="mini-text">
        <DecoratedName as="strong" name={person.name} color={decorations.nameColor}/>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {person.level && <LevelBadge level={person.level}/>}
    </div>
  </div>;
}
