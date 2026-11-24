// Relación de amistad con otra persona, tal como la manda el backend.
// none: nada · sent: le mandé una solicitud · received: me mandó una · friends: ya somos amigos · self: soy yo.
export const relationNames = { none: '', sent: 'Solicitud enviada', received: 'Te mandó una solicitud', friends: 'Amigos', self: 'Sos vos' };

export const friendsLabel = count => (count === 1 ? '1 amigo' : `${new Intl.NumberFormat('es-AR').format(count)} amigos`);

// Relación nueva después de una acción, según la respuesta del backend (data.relation).
// Si el backend no la manda, se deduce: quitar siempre deja 'none'.
export function nextRelation(action, data) {
  if (data?.relation) return data.relation;
  return { send: 'sent', accept: 'friends', remove: 'none' }[action] ?? 'none';
}
