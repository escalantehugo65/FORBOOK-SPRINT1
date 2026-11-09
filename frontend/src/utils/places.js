// Nombres en pantalla de los tipos de lugar, de los medios de transporte y de los motivos de sugerencia.
export const placeKinds = {
  institution: 'Instituciones',
  health: 'Salud',
  security: 'Seguridad',
  procedures: 'Trámites',
  transport: 'Transporte',
  services: 'Servicios',
};
// En salud y seguridad importa mucho de dónde sale el dato (FF-23).
export const sensitiveKinds = ['health', 'security'];
export const routeModes = { walk: 'A pie', bus: 'Colectivo', bike: 'Bicicleta', car: 'Auto o remis', mixed: 'Combinado' };
export const groupKinds = { institution: 'Por institución', origin: 'Por procedencia', arrival: 'Por situación de llegada', general: 'General' };
export const groupReasons = { institution: 'tu institución', origin: 'tu procedencia', arrival: 'tu situación de llegada' };
