// Efecto de perfil de la tienda (burbujas, luciérnagas, pétalos o confeti) sobre la cabecera del perfil.
// Es decorativo: no se lee en voz alta ni recibe clics. Con "reducir movimiento" las partículas quedan quietas.
const counts = { 'efecto-burbujas': 14, 'efecto-luciernagas': 16, 'efecto-petalos': 16, 'efecto-confeti': 26 };
const durations = { 'efecto-burbujas': [6, 11], 'efecto-luciernagas': [5, 9], 'efecto-petalos': [7, 12], 'efecto-confeti': [4, 7] };

// Números "al azar" pero siempre iguales para la misma partícula: así no saltan al volver a dibujar.
const random = (index, salt) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export default function ProfileEffect({ effect, dense = true }) {
  if (!effect || !counts[effect]) return null;
  const total = dense ? counts[effect] : Math.ceil(counts[effect] / 2);
  const [shortest, longest] = durations[effect];
  return <div className={`profile-effect effect-${effect}`} aria-hidden="true">
    {Array.from({ length: total }, (_, index) => {
      const duration = shortest + random(index, 1) * (longest - shortest);
      return <span key={index} style={{
        '--x': `${Math.round(((index + random(index, 2)) / total) * 1000) / 10}%`,
        '--y': `${Math.round(random(index, 3) * 900) / 10}%`,
        '--size': `${Math.round(6 + random(index, 4) * 10)}px`,
        '--drift': `${Math.round((random(index, 5) - 0.5) * 80)}px`,
        '--spin': `${Math.round(180 + random(index, 6) * 540)}deg`,
        '--duration': `${duration.toFixed(2)}s`,
        // Demora negativa: al abrir el perfil las partículas ya están en movimiento, no salen todas juntas.
        '--delay': `${(-random(index, 7) * duration).toFixed(2)}s`,
      }}/>;
    })}
  </div>;
}
