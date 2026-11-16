// La búsqueda del backend no distingue mayúsculas ni tildes ("tramite" encuentra "Trámite").
// Para resaltar lo encontrado se compara igual: cada letra sin tilde y en minúscula.
const fold = character => character.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Devuelve los tramos [inicio, fin) del texto original donde aparece lo buscado.
export function findMatches(text = '', query = '') {
  const wanted = [...query.trim()].map(fold).join('');
  if (!wanted || !text) return [];
  let folded = '';
  const origin = []; // origin[i] = posición en el texto original de la letra i de folded
  [...text].reduce((position, character) => {
    for (const letter of fold(character)) { folded += letter; origin.push(position); }
    return position + character.length;
  }, 0);
  const ranges = [];
  for (let index = folded.indexOf(wanted); index !== -1; index = folded.indexOf(wanted, index + wanted.length)) {
    const last = origin[index + wanted.length - 1];
    let end = last + [...text.slice(last)][0].length;
    // Una tilde escrita aparte (e + ́) queda pegada a su letra.
    while (end < text.length && /[̀-ͯ]/.test(text[end])) end += 1;
    ranges.push([origin[index], end]);
  }
  return ranges;
}

// Parte el texto en pedazos { text, match } para dibujarlo con <mark>.
export function splitMatches(text = '', query = '') {
  const parts = [];
  let cursor = 0;
  for (const [start, end] of findMatches(text, query)) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
