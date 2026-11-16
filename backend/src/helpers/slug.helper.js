// "Salud y trámites" → "salud-y-tramites". Sin tildes ni símbolos, hasta 100 caracteres.
export const slugify = (name) => name
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);
