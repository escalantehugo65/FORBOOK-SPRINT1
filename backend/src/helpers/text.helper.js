// Recorta un texto largo para mostrar un adelanto: shorten('Una respuesta muy larga…', 140).
export const shorten = (text, max) => (text.length > max ? `${text.slice(0, max - 3)}…` : text);
