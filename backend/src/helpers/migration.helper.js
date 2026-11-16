// Convierte los atributos de un modelo al formato de createTable, con el nombre real de cada columna
// (institutionId → institution_id). Así cada tabla se crea igual que como la define su modelo.
export const tableColumns = (model) => Object.fromEntries(
  Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]),
);
