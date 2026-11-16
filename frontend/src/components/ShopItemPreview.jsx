import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import ProfileEffect from './ProfileEffect';
import { firstName } from '../utils/content';

// Cómo se ve una decoración de la tienda sobre la cuenta de quien mira (su foto o sus iniciales y su nombre).
export default function ShopItemPreview({ item, person, className = '' }) {
  const plain = { ...person, decorations: {} };
  if (item.category === 'banner') {
    return <div className={`item-stage stage-banner banner-${item.slug} ${className}`.trim()} aria-hidden="true">
      <Avatar person={plain} size="mini" frame={null}/>
    </div>;
  }
  if (item.category === 'effect') {
    return <div className={`item-stage stage-${item.rarity} ${className}`.trim()} aria-hidden="true">
      <Avatar person={plain} size="shop" frame={null}/>
      <ProfileEffect effect={item.slug}/>
    </div>;
  }
  if (item.category === 'name_color') {
    return <div className={`item-stage stage-name stage-${item.rarity} ${className}`.trim()} aria-hidden="true">
      <DecoratedName name={firstName(person.name) || 'Tu nombre'} color={item.slug}/>
    </div>;
  }
  return <div className={`item-stage stage-${item.rarity} ${className}`.trim()} aria-hidden="true">
    <Avatar person={plain} size="shop" frame={item.slug}/>
  </div>;
}
