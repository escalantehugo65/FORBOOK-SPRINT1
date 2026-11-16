// Nombre con el color comprado en la tienda (si lo tiene puesto). El texto sigue siendo texto: se lee y se copia igual.
export default function DecoratedName({ name, color, as: Tag = 'span', className = '', ...props }) {
  const classes = [className, color && `name-color name-${color}`].filter(Boolean).join(' ');
  return <Tag className={classes || undefined} {...props}>{name}</Tag>;
}
