// Referencias consultadas el 20/10/2026. La fecha indica revisión editorial,
// no fecha de publicación de las páginas de origen. No se copian artículos.
export const institutions = [{ name: 'Universidad Nacional de Formosa (UNaF)', sourceUrl: 'https://www.unf.edu.ar/' }, { name: 'Instituto Politécnico Formosa (IPF)', sourceUrl: 'https://www.ipf.edu.ar/' }];
export const categories = [
  { name: 'Lugares útiles', slug: 'lugares-utiles', description: 'Puntos de consulta y servicios para tus primeros días.' },
  { name: 'Movilidad', slug: 'movilidad', description: 'Información para preparar tus desplazamientos por Formosa.' },
  { name: 'Vida estudiantil', slug: 'vida-estudiantil', description: 'Herramientas y referencias de tu vida académica.' },
  { name: 'Cultura y costumbres', slug: 'cultura-costumbres', description: 'Un espacio para conocer la vida cotidiana de la ciudad.' },
  { name: 'Recomendaciones', slug: 'recomendaciones', description: 'Orientaciones prácticas, siempre con su origen identificado.' },
];
export const contents = [
  { slug: 'portal-unaf', title: 'Tu punto de partida en la UNaF', categorySlug: 'vida-estudiantil', institutional: true,
    summary: 'Encontrá la web institucional de la Universidad Nacional de Formosa.',
    body: 'La Universidad Nacional de Formosa cuenta con un portal institucional con noticias y enlaces académicos. Si vas a estudiar allí, utilizá esta referencia para comenzar a consultar información de la universidad.\n\nLos requisitos y las fechas de cada trámite deben confirmarse en la publicación correspondiente o con tu unidad académica. Esta ficha no reemplaza los avisos de la institución.',
    sourceLabel: 'Universidad Nacional de Formosa — portal institucional', sourceUrl: 'https://www.unf.edu.ar/' },
  { slug: 'siu-guarani', title: 'Conocé el acceso a SIU Guaraní', categorySlug: 'vida-estudiantil', institutional: true,
    summary: 'Una referencia para acceder a la autogestión académica de la UNaF.',
    body: 'El acceso de SIU Guaraní de la UNaF informa que el sistema permite inscribirse a materias y exámenes, consultar el plan de estudios y la historia académica, y actualizar datos personales.\n\nAccedé desde el enlace oficial. Forbook no solicita ni almacena tus credenciales de SIU Guaraní. Para habilitar el acceso o resolver problemas con tu cuenta, consultá a la universidad.',
    sourceLabel: 'UNaF — SIU Guaraní', sourceUrl: 'https://guarani.unf.edu.ar/autogestion/acceso?auth=form' },
  { slug: 'unaf-virtual', title: 'UNaF Virtual: una referencia académica', categorySlug: 'recomendaciones', institutional: true,
    summary: 'Consultá el espacio de educación virtual de la universidad.',
    body: 'UNaF Virtual se presenta como un espacio de la Universidad Nacional de Formosa para el intercambio y la comunicación de la comunidad universitaria.\n\nRevisá la información de tu carrera para conocer qué entornos utiliza. La existencia de este portal no significa que todas las carreras se cursen a distancia.',
    sourceLabel: 'Universidad Nacional de Formosa — UNaF Virtual', sourceUrl: 'https://sied.unf.edu.ar/' },
  { slug: 'portal-municipal', title: 'Consultá el portal municipal', categorySlug: 'lugares-utiles', institutional: false,
    summary: 'Una puerta de entrada a información y trámites de la ciudad de Formosa.',
    body: 'El portal municipal de Formosa ofrece una sección de trámites. Podés consultarlo como punto inicial para identificar el área municipal relacionada con una gestión.\n\nAntes de trasladarte, confirmá en la fuente los requisitos, el lugar y el horario vigentes. Esta ficha no afirma horarios de atención ni requisitos específicos.',
    sourceLabel: 'Municipalidad de Formosa — portal web', sourceUrl: 'https://www.formosatuciudad.gob.ar/index.php' },
];

// Rutas orientativas (FF-22). Vacío hasta tener referencias comprobadas: nada de recorridos inventados.
// Ejemplo de formato (los pasos van separados por \n):
// { slug: 'centro-campus-unaf', institutionName: institutions[0].name, destinationSlug: 'unaf-campus',
//   title: 'Del centro al Campus de la UNaF', originLabel: 'Plaza San Martín', mode: 'bus',
//   steps: 'Primer paso con una referencia\nSegundo paso', durationLabel: null,
//   sourceType: 'community', sourceLabel: 'Quién lo comprobó y cuándo', sourceUrl: null }
export const travelRoutes = [];

// Épica 6: espacios de integración. Son secciones públicas que Forbook ya tiene;
// no hay membresía ni chat privado. linkPath con {institutionId} se completa al cargar.
export const groups = [
  { slug: 'preguntas-comunidad', name: 'Preguntas de la comunidad', kind: 'general',
    audience: 'Cualquier estudiante con cuenta en Forbook.',
    summary: 'Preguntá en público lo que no sabés de Formosa y ayudá con lo que ya conocés.',
    purpose: 'Es el espacio abierto de Forbook para resolver dudas de la vida estudiantil: trámites, movilidad, dónde comprar o cómo funciona algo en la ciudad.\n\nTodo lo que se publica es público y queda a la vista de otros estudiantes. Las respuestas útiles se marcan para que las encuentre quien llegue después.',
    linkPath: '/preguntas', linkLabel: 'Ir a Preguntas' },
  ...institutions.map((institution, index) => ({
    slug: `estudiantes-${['unaf', 'ipf'][index]}`, name: `Estudiantes ${['de la UNaF', 'del IPF'][index]}`, kind: 'institution', institutionName: institution.name,
    audience: `Estudiantes de ${institution.name}.`,
    summary: `Preguntas y respuestas públicas sobre la vida en ${['la UNaF', 'el IPF'][index]}.`,
    purpose: `Reúne las preguntas que hacen estudiantes de ${institution.name}, para que encuentres a quienes cursan en el mismo lugar que vos.\n\nSirve como primera puerta de contacto: las conversaciones son públicas y respetan las normas de Forbook.`,
    linkPath: '/preguntas?institutionId={institutionId}', linkLabel: 'Ver sus preguntas' })),
  { slug: 'antes-de-llegar', name: 'Antes de llegar', kind: 'arrival', arrivalScope: 'not_arrived',
    audience: 'Quienes todavía no se mudaron a Formosa.',
    summary: 'Lo que conviene leer y preguntar antes del viaje.',
    purpose: 'Pensado para la etapa de preparación: conocer la ciudad, las instituciones y las costumbres antes de mudarte.\n\nTe lleva a las fichas de Conozcamos Formosa, con la fuente y la fecha de revisión de cada dato.',
    linkPath: '/conozcamos', linkLabel: 'Ir a Conozcamos Formosa' },
  { slug: 'primeros-dias', name: 'Primeros días en la ciudad', kind: 'arrival', arrivalScope: 'arrived',
    audience: 'Quienes ya llegaron a Formosa.',
    summary: 'Ubicá lugares útiles y resolvé lo cotidiano.',
    purpose: 'Para los primeros días después de la mudanza: saber dónde queda cada cosa y cómo llegar a tu institución.\n\nTe lleva al mapa de lugares y a las rutas orientativas.',
    linkPath: '/mapa', linkLabel: 'Ir al mapa' },
  { slug: 'de-afuera', name: 'Llegás de otra provincia o país', kind: 'origin', originScope: 'outside',
    audience: 'Estudiantes que no son de la provincia de Formosa.',
    summary: 'Para conocer la vida cotidiana y las costumbres de la ciudad.',
    purpose: 'Si venís de afuera, hay cosas que para quien es de acá son obvias y para vos no. Este espacio junta la información de cultura y vida cotidiana de Formosa.\n\nSi algo no está, preguntalo en público: seguro le sirve a alguien más.',
    linkPath: '/conozcamos', linkLabel: 'Ir a Conozcamos Formosa' },
];
